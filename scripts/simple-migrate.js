const { Pool } = require('pg');
require('dotenv').config();

// Database configuration for Railway
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);

async function runMigrations() {
  console.log('🔄 Starting simple database migration...');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Create tables in correct order
    const migrations = [
      // 1. Enable extensions
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
      
      // 2. Create users table first
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        profile_image_url TEXT,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )`,
      
      // 3. Create stores table (depends on users)
      `CREATE TABLE IF NOT EXISTS stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_name VARCHAR(255) NOT NULL,
        store_description TEXT,
        store_image_url TEXT,
        store_url_slug VARCHAR(255) UNIQUE NOT NULL,
        location_city VARCHAR(100),
        location_state VARCHAR(100),
        location_country VARCHAR(100),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        social_instagram VARCHAR(255),
        social_facebook VARCHAR(255),
        social_website VARCHAR(255),
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 4. Create sales table (depends on users and stores)
      `CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        brand VARCHAR(100),
        condition VARCHAR(50) CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
        size VARCHAR(50),
        color VARCHAR(50),
        material VARCHAR(100),
        tags TEXT[],
        location_city VARCHAR(100),
        location_state VARCHAR(100),
        location_zip VARCHAR(20),
        shipping_available BOOLEAN DEFAULT true,
        local_pickup BOOLEAN DEFAULT false,
        shipping_cost DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'pending', 'removed', 'expired')),
        featured BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        favorite_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        sold_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 5. Create other tables
      `CREATE TABLE IF NOT EXISTS images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        alt_text VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        file_size INTEGER,
        dimensions VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id VARCHAR(255) UNIQUE,
        stripe_charge_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
        payment_method VARCHAR(50),
        shipping_address JSONB,
        billing_address JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        review_type VARCHAR(20) DEFAULT 'buyer' CHECK (review_type IN ('buyer', 'seller')),
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sale_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS search_queries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        query TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        results_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    console.log(`📄 Found ${migrations.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < migrations.length; i++) {
      const statement = migrations[i];
      console.log(`⚡ Executing statement ${i + 1}/${migrations.length}`);
      await pool.query(statement);
    }
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)',
      'CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(category)',
      'CREATE INDEX IF NOT EXISTS idx_images_sale_id ON images(sale_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id)'
    ];
    
    for (const index of indexes) {
      await pool.query(index);
    }
    
    // Insert default categories
    console.log('📝 Inserting default categories...');
    const categories = [
      "INSERT INTO categories (name, slug, description) VALUES ('Fashion', 'fashion', 'Clothing, accessories, and fashion items') ON CONFLICT (slug) DO NOTHING",
      "INSERT INTO categories (name, slug, description) VALUES ('Electronics', 'electronics', 'Gadgets, computers, and electronic devices') ON CONFLICT (slug) DO NOTHING",
      "INSERT INTO categories (name, slug, description) VALUES ('Home & Garden', 'home-garden', 'Home decor, furniture, and garden items') ON CONFLICT (slug) DO NOTHING",
      "INSERT INTO categories (name, slug, description) VALUES ('Sports & Outdoors', 'sports-outdoors', 'Sporting goods and outdoor equipment') ON CONFLICT (slug) DO NOTHING",
      "INSERT INTO categories (name, slug, description) VALUES ('Books & Media', 'books-media', 'Books, movies, music, and games') ON CONFLICT (slug) DO NOTHING"
    ];
    
    for (const category of categories) {
      await pool.query(category);
    }
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
