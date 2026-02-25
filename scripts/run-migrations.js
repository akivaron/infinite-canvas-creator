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
  console.log('\nThis project uses Supabase for database management.');
  console.log('Migrations are automatically applied when using the');
  console.log('mcp__supabase__apply_migration tool in the codebase.\n');

  console.log('📁 Migrations Location:');
  console.log('   supabase/migrations/\n');

  showMigrationStatus();

  console.log('\n🔧 Manual Migration Options:\n');
  console.log('1. Supabase Dashboard:');
  console.log('   • Go to: https://app.supabase.com');
  console.log('   • Navigate to: SQL Editor');
  console.log('   • Copy and paste migration SQL');
  console.log('   • Click "Run"\n');

  console.log('2. Supabase CLI (if installed):');
  console.log('   • Run: supabase db push');
  console.log('   • Or: supabase db reset\n');

  console.log('3. PostgreSQL Client (psql):');
  console.log('   • Get connection string from .env');
  console.log('   • Run: psql $DATABASE_URL < migration.sql\n');

  console.log('4. Using code (recommended):');
  console.log('   • Migrations are applied automatically');
  console.log('   • Via mcp__supabase__apply_migration tool');
  console.log('   • No manual action needed\n');

  console.log('═'.repeat(60));
}

function showResetInstructions() {
  console.log('\n🔄 Database Reset Instructions\n');
  console.log('═'.repeat(60));
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA!\n');

  console.log('Options to reset database:\n');

  console.log('1. Supabase Dashboard:');
  console.log('   • Go to: Database → Settings');
  console.log('   • Click "Reset Database"\n');

  console.log('2. Supabase CLI:');
  console.log('   • Run: supabase db reset');
  console.log('   • This will reapply all migrations\n');

  console.log('3. Manual SQL:');
  console.log('   • DROP all tables manually');
  console.log('   • Re-run all migrations\n');

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
