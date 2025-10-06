const { Pool } = require('pg');
require('dotenv').config();

console.log('🗄️  Database Connection Test');
console.log('==============================\n');

async function testDatabase() {
  console.log('📋 Environment Check:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.log('\n❌ DATABASE_URL not found in environment variables');
    console.log('💡 Make sure to set DATABASE_URL in Railway dashboard');
    return;
  }

  console.log('\n🔌 Testing database connection...');
  
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  try {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connection successful!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Tables found: ${tablesResult.rows.length}`);
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tables:', tablesResult.rows.map(r => r.table_name).join(', '));
      console.log('\n🎉 Database is ready! Your API should work now.');
    } else {
      console.log('⚠️  No tables found - you need to run migrations');
      console.log('💡 Run: npm run railway-migrate');
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('\n🔧 Common fixes:');
    console.log('1. Check DATABASE_URL format');
    console.log('2. Ensure PostgreSQL service is running on Railway');
    console.log('3. Verify database exists and is accessible');
    console.log('4. Check if migrations have been run');
    
    if (error.message.includes('timeout')) {
      console.log('\n⏰ Connection timeout - check your Railway PostgreSQL service');
    }
    if (error.message.includes('authentication')) {
      console.log('\n🔐 Authentication failed - check your DATABASE_URL credentials');
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🌐 Network error - check your DATABASE_URL hostname');
    }
  }
}

testDatabase().catch(console.error);
