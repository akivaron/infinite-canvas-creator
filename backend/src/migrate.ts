import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query } from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('Starting database migration from SQL files...');

  const migrationsDir = path.resolve(__dirname, '../migrations');

  try {
    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      process.exit(0);
    }

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      const sql = await fs.readFile(fullPath, 'utf8');
      await query(sql);
    }

    console.log('Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

migrate();

