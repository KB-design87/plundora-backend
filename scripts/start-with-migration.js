const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Plundora Backend with Migration Check...');

async function runMigration() {
  console.log('📊 Running database migrations...');
  
  try {
    // Import and run the migration directly
    const migrationScript = require('./railway-migrate-direct.js');
    console.log('✅ Migration script loaded');
    return Promise.resolve();
  } catch (error) {
    console.log('⚠️  Migration error (continuing startup):', error.message);
    // Don't fail the startup if migrations fail
    return Promise.resolve();
  }
}

async function startServer() {
  console.log('🎯 Starting Plundora server...');
  
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });
}

async function main() {
  try {
    // Run migrations first
    await runMigration();
    
    // Then start the server
    await startServer();
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main();
