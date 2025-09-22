#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function deploySetup() {
  console.log('🚀 Starting Plundora Backend Deployment Setup...\n');

  try {
    // Check if .env file exists
    const envPath = path.join(__dirname, '..', '.env');
    try {
      await fs.access(envPath);
      console.log('✅ .env file found');
    } catch {
      console.log('⚠️  .env file not found');
      console.log('📝 Creating .env from example...');

      try {
        const exampleEnv = await fs.readFile(path.join(__dirname, '..', '.env.example'), 'utf8');
        await fs.writeFile(envPath, exampleEnv);
        console.log('✅ .env file created from .env.example');
        console.log('⚠️  Please edit .env file with your actual configuration values');
      } catch (error) {
        console.error('❌ Failed to create .env file:', error.message);
        process.exit(1);
      }
    }

    // Check uploads directory
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    try {
      await fs.access(uploadsPath);
      console.log('✅ Uploads directory exists');
    } catch {
      console.log('📁 Creating uploads directory...');
      await fs.mkdir(uploadsPath, { recursive: true });
      console.log('✅ Uploads directory created');
    }

    // Check logs directory
    const logsPath = path.join(__dirname, '..', 'logs');
    try {
      await fs.access(logsPath);
      console.log('✅ Logs directory exists');
    } catch {
      console.log('📁 Creating logs directory...');
      await fs.mkdir(logsPath, { recursive: true });
      console.log('✅ Logs directory created');
    }

    // Display next steps
    console.log('\n🎉 Deployment setup complete!\n');
    console.log('📋 Next steps:');
    console.log('1. Edit .env file with your configuration');
    console.log('2. Set up your PostgreSQL database');
    console.log('3. Run: npm run setup');
    console.log('4. Run: npm start (or npm run dev for development)');
    console.log('\n📚 For detailed setup instructions, see README_BACKEND.md');

  } catch (error) {
    console.error('💥 Deployment setup failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  deploySetup();
}

module.exports = { deploySetup };