const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Plundora Backend with Migration Check...');

async function runMigration() {
  console.log('📊 Checking if migrations need to be run...');
  
  return new Promise((resolve, reject) => {
    const migrateProcess = spawn('npm', ['run', 'migrate-direct'], {
      stdio: 'inherit',
      shell: true
    });
    
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Migrations completed successfully');
        resolve();
      } else {
        console.log('⚠️  Migration completed with warnings (code:', code, ')');
        // Don't fail the startup if migrations have warnings
        resolve();
      }
    });
    
    migrateProcess.on('error', (error) => {
      console.log('⚠️  Migration error (continuing startup):', error.message);
      // Don't fail the startup if migrations fail
      resolve();
    });
  });
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
