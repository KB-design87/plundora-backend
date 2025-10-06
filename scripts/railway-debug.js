const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Railway Deployment Debug Script');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET (length: ' + process.env.JWT_SECRET.length + ')' : 'NOT SET');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET (length: ' + process.env.STRIPE_SECRET_KEY.length + ')' : 'NOT SET');
console.log('');

// Test database connection
async function testDatabase() {
  console.log('🗄️  Database Connection Test:');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set');
    return false;
  }

  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  try {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('⏰ Current time:', result.rows[0].current_time);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:', tablesResult.rows.length);
    if (tablesResult.rows.length > 0) {
      console.log('   Tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('⚠️  No tables found - migrations may be needed');
    }
    
    client.release();
    await pool.end();
    return true;
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('💡 Common fixes:');
    console.log('   - Check DATABASE_URL format');
    console.log('   - Ensure PostgreSQL service is running on Railway');
    console.log('   - Check if database exists');
    return false;
  }
}

// Test server routes
async function testServerRoutes() {
  console.log('\n🚀 Server Routes Test:');
  
  try {
    const express = require('express');
    const app = express();
    
    // Import routes to test if they load correctly
    const salesRoutes = require('../routes/sales');
    const authRoutes = require('../routes/auth');
    const paymentsRoutes = require('../routes/payments');
    const storesRoutes = require('../routes/stores');
    
    console.log('✅ All route files loaded successfully');
    console.log('📝 Available routes:');
    console.log('   - /api/sales');
    console.log('   - /api/auth');
    console.log('   - /api/payments');
    console.log('   - /api/stores');
    console.log('   - /health');
    
    return true;
  } catch (error) {
    console.log('❌ Route loading failed:', error.message);
    return false;
  }
}

// Main debug function
async function runDebug() {
  console.log('🔧 Starting Railway deployment diagnostics...\n');
  
  const dbOk = await testDatabase();
  const routesOk = testServerRoutes();
  
  console.log('\n📊 Summary:');
  console.log('Database:', dbOk ? '✅ OK' : '❌ FAILED');
  console.log('Routes:', routesOk ? '✅ OK' : '❌ FAILED');
  
  if (!dbOk) {
    console.log('\n🔧 To fix database issues:');
    console.log('1. Go to Railway dashboard');
    console.log('2. Add PostgreSQL service to your project');
    console.log('3. Copy the DATABASE_URL to environment variables');
    console.log('4. Run: npm run railway-migrate');
  }
  
  if (!routesOk) {
    console.log('\n🔧 To fix route issues:');
    console.log('1. Check for syntax errors in route files');
    console.log('2. Ensure all dependencies are installed');
    console.log('3. Check Railway build logs');
  }
  
  console.log('\n🚀 If both are OK, your API should work at:');
  console.log('https://your-service-name.railway.app');
  console.log('Test with: curl https://your-service-name.railway.app/health');
}

runDebug().catch(console.error);
