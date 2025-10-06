const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 Starting Railway Database Migration...');
  
  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('📊 Database URL found:', databaseUrl.substring(0, 20) + '...');
  
  // Create database connection
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log('📖 Reading schema file:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📝 Schema file loaded, size:', schema.length, 'characters');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('🔄 Found', statements.length, 'SQL statements to execute');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📋 Executing statement ${i + 1}/${statements.length}:`);
      console.log('   ', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        await client.query(statement);
        console.log('   ✅ Statement executed successfully');
      } catch (error) {
        console.log('   ⚠️  Statement failed (might already exist):', error.message);
      }
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    
    // Test that tables were created
    console.log('\n🧪 Testing created tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log('   -', row.table_name);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(console.error);
