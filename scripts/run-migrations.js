#!/usr/bin/env node

/**
 * PostgreSQL Migration Runner
 *
 * This script helps run Supabase migrations.
 * Migrations are located in supabase/migrations/ directory.
 *
 * Usage:
 *   npm run db:migrate        - Show migration instructions
 *   npm run db:status         - Check migration status
 *   npm run db:reset          - Reset database instructions
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const MIGRATIONS_DIR = join(projectRoot, 'supabase', 'migrations');

function getMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
    return [];
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(file => ({
    name: file,
    path: join(MIGRATIONS_DIR, file),
  }));
}

function showMigrationStatus() {
  console.log('\n📊 Migration Status\n');
  console.log('═'.repeat(60));

  const migrations = getMigrations();

  if (migrations.length === 0) {
    console.log('No migrations found in supabase/migrations/');
    return;
  }

  console.log(`Found ${migrations.length} migration(s):\n`);

  migrations.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration.name}`);
  });

  console.log('\n' + '═'.repeat(60));
}

function showMigrationInstructions() {
  console.log('\n🗄️  Database Migration Instructions\n');
  console.log('═'.repeat(60));
  console.log('\nThis project uses PostgreSQL for database management.');
  console.log('Migrations need to be applied manually using psql or');
  console.log('PostgreSQL client of your choice.\n');

  console.log('📁 Migrations Location:');
  console.log('   supabase/migrations/\n');

  showMigrationStatus();

  console.log('\n🔧 Migration Options:\n');
  console.log('1. PostgreSQL Client (psql) - Recommended:');
  console.log('   • Get connection string from .env');
  console.log('   • Run single migration:');
  console.log('     psql $DATABASE_URL < supabase/migrations/migration_file.sql\n');
  console.log('   • Run all migrations:');
  console.log('     for file in supabase/migrations/*.sql; do');
  console.log('       psql $DATABASE_URL < "$file"');
  console.log('     done\n');

  console.log('2. GUI Tools:');
  console.log('   • pgAdmin: Import and run SQL files');
  console.log('   • DBeaver: Execute SQL scripts');
  console.log('   • TablePlus: Run SQL queries\n');

  console.log('3. Node.js Script:');
  console.log('   • Use pg library to run migrations');
  console.log('   • See backend/src/config/database.ts for connection\n');

  console.log('═'.repeat(60));
}

function showResetInstructions() {
  console.log('\n🔄 Database Reset Instructions\n');
  console.log('═'.repeat(60));
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA!\n');

  console.log('Options to reset database:\n');

  console.log('1. Drop and Recreate Database:');
  console.log('   • Connect to PostgreSQL');
  console.log('   • Run: DROP DATABASE database_name;');
  console.log('   • Run: CREATE DATABASE database_name;');
  console.log('   • Reapply all migrations\n');

  console.log('2. Drop All Tables:');
  console.log('   • Run SQL to drop all tables in schema');
  console.log('   • Reapply all migrations\n');

  console.log('3. Using psql:');
  console.log('   • psql -c "DROP DATABASE database_name;"');
  console.log('   • psql -c "CREATE DATABASE database_name;"');
  console.log('   • Run migrations again\n');

  console.log('═'.repeat(60));
}

function listMigrations() {
  console.log('\n📋 Available Migrations\n');
  console.log('═'.repeat(60));

  const migrations = getMigrations();

  if (migrations.length === 0) {
    console.log('No migrations found.\n');
    return;
  }

  migrations.forEach((migration, index) => {
    console.log(`\n${index + 1}. ${migration.name}`);
    console.log('─'.repeat(60));

    try {
      const content = readFileSync(migration.path, 'utf8');
      const lines = content.split('\n');

      // Show first 10 lines (usually contains the description)
      const preview = lines.slice(0, 15).join('\n');
      console.log(preview);

      if (lines.length > 15) {
        console.log('...');
        console.log(`(${lines.length - 15} more lines)`);
      }
    } catch (error) {
      console.error('Error reading migration:', error.message);
    }
  });

  console.log('\n' + '═'.repeat(60));
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'status':
    showMigrationStatus();
    break;
  case 'list':
    listMigrations();
    break;
  case 'reset':
    showResetInstructions();
    break;
  case 'help':
    console.log('\nUsage:');
    console.log('  npm run db:migrate        - Show migration instructions');
    console.log('  npm run db:status         - Show migration status');
    console.log('  npm run db:list           - List all migrations with preview');
    console.log('  npm run db:reset          - Show reset instructions');
    console.log('  npm run db:help           - Show this help\n');
    break;
  default:
    showMigrationInstructions();
}
