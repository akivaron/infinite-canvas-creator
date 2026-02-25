# Database Migration Guide

Complete guide for managing PostgreSQL migrations in this project.

---

## 📋 Overview

This project uses **Supabase** for database management with PostgreSQL. All migrations are stored in the `supabase/migrations/` directory.

**Migration Tool:** Supabase MCP (Model Context Protocol) integration

---

## 🚀 Quick Start

### Available Commands

```bash
# Show migration instructions and overview
npm run db:migrate

# Check migration status (list all migrations)
npm run db:status

# List all migrations with preview
npm run db:list

# Show database reset instructions
npm run db:reset

# Show help for all commands
npm run db:help
```

---

## 📁 Migration Structure

**Location:** `supabase/migrations/`

**Naming Convention:**
```
YYYYMMDDHHMMSS_description.sql

Example:
20260225051444_create_domains_table.sql
```

**Format:**
- Timestamp prefix (YYYYMMDDHHMMSS)
- Underscore separator
- Descriptive name (snake_case)
- `.sql` extension

---

## 📊 Current Migrations

Run `npm run db:status` to see all migrations:

```
📊 Migration Status

Found 8 migration(s):

1. 20260224101019_create_projects_and_generated_files.sql
2. 20260224174328_create_payments_tables.sql
3. 20260224180750_create_agent_sessions_and_context.sql
4. 20260224182040_setup_pgvector_embeddings.sql
5. 20260224182851_create_canvas_nodes_and_projects_enhanced.sql
6. 20260224185604_add_collaboration_features.sql
7. 20260224190410_create_hosting_deployment_system.sql
8. 20260225051444_create_domains_table.sql
```

---

## 🔧 How Migrations Work

### Automatic Application

Migrations in this project are **automatically applied** using the Supabase MCP tool:

```typescript
// In code (AI agent)
await mcp__supabase__apply_migration({
  filename: 'create_domains_table',
  content: `/* SQL migration content */`
});
```

**Benefits:**
- ✅ Automatic application
- ✅ No manual steps needed
- ✅ Tracked in Supabase
- ✅ Version controlled
- ✅ Safe rollback support

---

## 📝 Migration Best Practices

### 1. Always Include Comments

Start every migration with detailed comments:

```sql
/*
  # Migration Title

  1. New Tables
    - `table_name`
      - `column1` (type) - Description
      - `column2` (type) - Description

  2. Changes
    - What changed and why

  3. Security
    - RLS policies added
    - Permissions configured
*/
```

### 2. Use IF EXISTS / IF NOT EXISTS

Always use conditional checks:

```sql
-- Creating tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Adding columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Creating indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 3. Enable Row Level Security (RLS)

**CRITICAL:** Always enable RLS on new tables:

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add restrictive policies
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### 4. Add Indexes

Add indexes for frequently queried columns:

```sql
-- User lookup
CREATE INDEX IF NOT EXISTS idx_table_user_id ON table_name(user_id);

-- Foreign keys
CREATE INDEX IF NOT EXISTS idx_table_project_id ON table_name(project_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_table_status ON table_name(status);

-- Search fields
CREATE INDEX IF NOT EXISTS idx_table_name ON table_name(name);
```

### 5. Use Meaningful Defaults

Set appropriate default values:

```sql
CREATE TABLE example (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  is_active boolean DEFAULT true,
  count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[]
);
```

### 6. Add Triggers

Create triggers for automatic updates:

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_update_table_updated_at ON table_name;
CREATE TRIGGER trigger_update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 7. Never Use Destructive Operations

**NEVER** use these without careful consideration:

```sql
-- ❌ DANGEROUS - Don't use
DROP TABLE table_name;
DELETE FROM table_name;
TRUNCATE table_name;

-- ✅ SAFE - Use these instead
ALTER TABLE table_name RENAME TO table_name_old;
UPDATE table_name SET deleted_at = now() WHERE condition;
```

---

## 🔄 Manual Migration Options

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy migration SQL from `supabase/migrations/` directory
5. Paste into SQL editor
6. Click **Run**

**Pros:**
- ✅ Visual interface
- ✅ Immediate feedback
- ✅ Error messages displayed
- ✅ Query history tracked

---

### Option 2: Supabase CLI

**Install CLI:**
```bash
npm install -g supabase
```

**Commands:**
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push all pending migrations
supabase db push

# Reset database (⚠️ DANGER - deletes all data)
supabase db reset

# Create new migration
supabase migration new migration_name

# Check migration status
supabase migration list
```

**Pros:**
- ✅ Command-line workflow
- ✅ Version control integration
- ✅ Automated deployment
- ✅ Local development support

---

### Option 3: PostgreSQL Client (psql)

**Get connection string from `.env`:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/database
```

**Run migration:**
```bash
# Single migration
psql $DATABASE_URL < supabase/migrations/migration_file.sql

# All migrations (in order)
for file in supabase/migrations/*.sql; do
  psql $DATABASE_URL < "$file"
done
```

**Pros:**
- ✅ Direct database access
- ✅ Full PostgreSQL features
- ✅ Script automation
- ✅ Batch operations

---

### Option 4: Code Integration (Automatic)

**This is the default method in this project.**

Migrations are applied automatically via the MCP tool:

```typescript
import { mcp__supabase__apply_migration } from './tools';

// Apply migration
await mcp__supabase__apply_migration({
  filename: 'create_domains_table',
  content: `
    CREATE TABLE IF NOT EXISTS domains (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      domain_name text UNIQUE NOT NULL,
      ...
    );
  `
});
```

**Pros:**
- ✅ Fully automated
- ✅ No manual steps
- ✅ Tracked in codebase
- ✅ CI/CD friendly
- ✅ Rollback support

---

## 🔍 Checking Migration Status

### Using npm commands

```bash
# List all migrations
npm run db:status

# Show migration details with preview
npm run db:list
```

### Using Supabase Dashboard

1. Go to **Database** → **Migrations**
2. View applied migrations with timestamps
3. See migration history

### Using SQL Query

```sql
-- Check if migration table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'schema_migrations'
);

-- List applied migrations (if tracking table exists)
SELECT * FROM schema_migrations ORDER BY version;
```

---

## 🚨 Troubleshooting

### Migration Failed to Apply

**Error:** "relation already exists"

**Solution:**
- Use `CREATE TABLE IF NOT EXISTS`
- Check if table was partially created
- Drop table manually if needed

**Error:** "column already exists"

**Solution:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'your_table' AND column_name = 'your_column'
  ) THEN
    ALTER TABLE your_table ADD COLUMN your_column type;
  END IF;
END $$;
```

---

### RLS Policies Blocking Access

**Error:** "permission denied for table"

**Check:**
1. Is RLS enabled? `SELECT * FROM pg_tables WHERE tablename = 'your_table';`
2. Are policies created? `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. Is user authenticated? Check `auth.uid()`

**Debug:**
```sql
-- Temporarily disable RLS (development only!)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Check data
SELECT * FROM your_table;

-- Re-enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Add proper policies
CREATE POLICY "policy_name"
  ON your_table FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

---

### Foreign Key Violations

**Error:** "violates foreign key constraint"

**Solution:**
1. Ensure referenced table exists
2. Check referenced record exists
3. Use `ON DELETE CASCADE` if appropriate

```sql
-- Add foreign key with cascade
ALTER TABLE child_table
ADD CONSTRAINT fk_parent
FOREIGN KEY (parent_id)
REFERENCES parent_table(id)
ON DELETE CASCADE;
```

---

### Index Already Exists

**Error:** "relation already exists"

**Solution:**
```sql
-- Drop existing index
DROP INDEX IF EXISTS idx_name;

-- Create new index
CREATE INDEX idx_name ON table_name(column_name);

-- Or use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);
```

---

## 🔒 Security Checklist

Before applying any migration:

- [ ] RLS is enabled on all new tables
- [ ] Policies are restrictive (check `auth.uid()`)
- [ ] No policies use `USING (true)` without good reason
- [ ] Sensitive columns are protected
- [ ] Foreign keys have proper constraints
- [ ] Indexes don't expose sensitive data
- [ ] Default values are secure
- [ ] No hardcoded secrets or API keys

---

## 📈 Performance Tips

### 1. Create Indexes for Foreign Keys

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
```

### 2. Use Partial Indexes

```sql
-- Index only active records
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Index only recent records
CREATE INDEX idx_recent_orders ON orders(created_at)
  WHERE created_at > now() - interval '30 days';
```

### 3. Add Indexes for Sorting

```sql
-- For ORDER BY queries
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite index for complex queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at DESC);
```

### 4. Use JSONB Indexes

```sql
-- GIN index for JSONB
CREATE INDEX idx_metadata_gin ON table_name USING gin(metadata);

-- Index specific JSONB path
CREATE INDEX idx_metadata_tags ON table_name USING gin((metadata->'tags'));
```

---

## 📝 Migration Template

Use this template for new migrations:

```sql
/*
  # [Migration Title]

  1. New Tables
    - `table_name`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Added X feature
    - Modified Y behavior
    - Fixed Z issue

  3. Security
    - Enable RLS on `table_name`
    - Add policies for authenticated users
    - Restrict access to own records

  4. Indexes
    - Added index on `user_id`
    - Added index on `created_at`

  5. Notes
    - Important considerations
    - Migration dependencies
*/

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_table_user_id ON table_name(user_id);
CREATE INDEX IF NOT EXISTS idx_table_status ON table_name(status);
CREATE INDEX IF NOT EXISTS idx_table_created_at ON table_name(created_at DESC);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own records"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON table_name FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_table_updated_at ON table_name;
CREATE TRIGGER trigger_update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_table_updated_at();

-- Add comments
COMMENT ON TABLE table_name IS 'Description of what this table stores';
COMMENT ON COLUMN table_name.status IS 'Current status: pending, active, completed';
```

---

## 🎯 Summary

**Migration Commands:**
```bash
npm run db:migrate   # Show instructions
npm run db:status    # List migrations
npm run db:list      # Preview migrations
npm run db:reset     # Reset instructions
npm run db:help      # Show help
```

**Key Points:**
- ✅ Migrations auto-apply via MCP tool
- ✅ Always use IF EXISTS/IF NOT EXISTS
- ✅ Enable RLS on all tables
- ✅ Add restrictive policies
- ✅ Create indexes for performance
- ✅ Use meaningful defaults
- ✅ Add triggers for auto-updates
- ✅ Never use destructive operations
- ✅ Test in development first
- ✅ Document all changes

**Migration Location:**
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

**Need Help?**
- Run: `npm run db:help`
- Check: Supabase Dashboard
- Read: This guide

---

**Happy Migrating! 🚀**
