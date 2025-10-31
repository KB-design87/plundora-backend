const fs = require('fs').promises;
const path = require('path');
const db = require('../db/connection');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    console.log('📄 Executing schema.sql');
    await db.query(schema);

    console.log('✅ Database migration completed successfully!');

    // Test the database connection
    const healthCheck = await db.healthCheck();
    if (healthCheck.healthy) {
      console.log('🎉 Database is healthy and ready to use!');
    } else {
      console.log('⚠️  Database health check failed:', healthCheck.error);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };