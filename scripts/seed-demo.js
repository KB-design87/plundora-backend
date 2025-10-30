const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../db/connection');

async function ensureUser(client, user) {
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
  if (existing.rows.length > 0) {
    console.log(`👤 User ${user.email} already exists`);
    return existing.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(user.password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  const result = await client.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, status, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [user.email, passwordHash, user.firstName, user.lastName, user.phone, user.role, user.status, true]
  );

  console.log(`✅ Created user ${user.email}`);
  return result.rows[0].id;
}

async function ensureStore(client, store) {
  const existing = await client.query('SELECT id FROM stores WHERE store_url_slug = $1', [store.slug]);
  if (existing.rows.length > 0) {
    console.log(`🏬 Store ${store.slug} already exists`);
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO stores (
      user_id, store_name, store_description, store_image_url,
      store_url_slug, location_city, location_state, location_country,
      contact_email, contact_phone, social_instagram, social_website,
      is_verified, rating, total_reviews
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id`,
    [
      store.userId,
      store.name,
      store.description,
      store.image,
      store.slug,
      store.city,
      store.state,
      store.country,
      store.contactEmail,
      store.contactPhone,
      store.instagram,
      store.website,
      store.isVerified,
      store.rating,
      store.totalReviews
    ]
  );

  console.log(`✅ Created store ${store.slug}`);
  return result.rows[0].id;
}

async function ensureSale(client, sale) {
  const existing = await client.query('SELECT id FROM sales WHERE store_id = $1 AND title = $2 LIMIT 1', [sale.storeId, sale.title]);
  if (existing.rows.length > 0) {
    console.log(`🛒 Sale "${sale.title}" already exists`);
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO sales (
      store_id, user_id, title, description, price, original_price,
      category, subcategory, brand, condition, size, color, material,
      tags, location_city, location_state, location_zip, shipping_available,
      local_pickup, shipping_cost, status, featured, view_count, favorite_count,
      expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24,
      $25
    ) RETURNING id`,
    [
      sale.storeId,
      sale.userId,
      sale.title,
      sale.description,
      sale.price,
      sale.originalPrice,
      sale.category,
      sale.subcategory,
      sale.brand,
      sale.condition,
      sale.size,
      sale.color,
      sale.material,
      sale.tags,
      sale.city,
      sale.state,
      sale.zip,
      sale.shippingAvailable,
      sale.localPickup,
      sale.shippingCost,
      sale.status,
      sale.featured,
      sale.viewCount,
      sale.favoriteCount,
      sale.expiresAt
    ]
  );

  console.log(`✅ Created sale "${sale.title}"`);
  return result.rows[0].id;
}

async function ensureImage(client, image) {
  const existing = await client.query('SELECT id FROM images WHERE sale_id = $1 AND image_url = $2 LIMIT 1', [image.saleId, image.imageUrl]);
  if (existing.rows.length > 0) {
    console.log(`🖼️  Image ${image.imageUrl} already exists`);
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO images (sale_id, image_url, thumbnail_url, alt_text, display_order, is_primary, file_size, dimensions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      image.saleId,
      image.imageUrl,
      image.thumbnailUrl,
      image.altText,
      image.displayOrder,
      image.isPrimary,
      image.fileSize,
      image.dimensions
    ]
  );

  console.log(`✅ Added image ${image.imageUrl}`);
  return result.rows[0].id;
}

async function seedDemoData() {
  try {
    console.log('🌱 Starting demo data seed...');

    await db.transaction(async (client) => {
      const userId = await ensureUser(client, {
        email: 'demo@plundora.com',
        password: 'ChangeMe123!',
        firstName: 'Demo',
        lastName: 'Seller',
        phone: '+1-555-0100',
        role: 'admin',
        status: 'active'
      });

      const storeId = await ensureStore(client, {
        userId,
        name: 'Treasure Trove Antiques',
        description: 'Curated vintage finds, estate pieces, and one-of-a-kind collectibles sourced nationwide.',
        image: 'https://images.unsplash.com/photo-1520694478166-daaaaec95b69?auto=format&fit=crop&w=900&q=80',
        slug: 'treasure-trove-antiques',
        city: 'Nashville',
        state: 'TN',
        country: 'USA',
        contactEmail: 'demo@plundora.com',
        contactPhone: '+1-555-0100',
        instagram: 'https://instagram.com/plundorademo',
        website: 'https://plundora.com',
        isVerified: true,
        rating: 4.9,
        totalReviews: 128
      });

      const saleId = await ensureSale(client, {
        storeId,
        userId,
        title: 'Historic Estate Sale – Mid-Century Modern & Americana',
        description: 'Two-day estate sale featuring mid-century modern furniture, record collections, neon signage, and Americana memorabilia from a single-owner collection.',
        price: 7.99,
        originalPrice: 12.99,
        category: 'Collectibles',
        subcategory: null,
        brand: 'Various Makers',
        condition: 'good',
        size: null,
        color: null,
        material: null,
        tags: ['estate', 'mid-century', 'americana'],
        city: 'Franklin',
        state: 'TN',
        zip: '37064',
        shippingAvailable: true,
        localPickup: true,
        shippingCost: 0,
        status: 'active',
        featured: true,
        viewCount: 892,
        favoriteCount: 156,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      });

      await ensureImage(client, {
        saleId,
        imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=60',
        altText: 'Vintage living room setup at estate sale',
        displayOrder: 0,
        isPrimary: true,
        fileSize: 350000,
        dimensions: '1200x800'
      });

      await ensureImage(client, {
        saleId,
        imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=400&q=60',
        altText: 'Vintage record collection on display',
        displayOrder: 1,
        isPrimary: false,
        fileSize: 280000,
        dimensions: '1200x800'
      });
    });

    console.log('🎉 Demo data seeding complete!');
  } catch (error) {
    console.error('💥 Failed to seed demo data:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };

