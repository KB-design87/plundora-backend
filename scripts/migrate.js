const fs = require('fs').promises;
const path = require('path');
const db = require('../db/connection');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    // Split into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.length === 0) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
        await db.query(statement);
      } catch (error) {
        // Ignore errors for CREATE EXTENSION and CREATE OR REPLACE statements
        // as they might already exist
        if (
          error.code === '42710' || // duplicate_object
          error.code === '42P07' || // duplicate_table
          error.code === '42723'    // duplicate_function
        ) {
          console.log(`⚠️  Skipping statement ${i + 1} (already exists)`);
          continue;
        }

        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 200) + '...');
        throw error;
      }
    }

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