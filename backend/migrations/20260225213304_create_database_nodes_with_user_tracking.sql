/*
  # Create Database Nodes Tracking System with User Isolation

  1. New Tables
    - `database_nodes`
      - `id` (uuid, primary key) - Unique identifier
      - `node_id` (text, unique) - ID of the canvas node
      - `user_id` (uuid, foreign key) - Owner of the database node
      - `schema_name` (text, unique) - PostgreSQL schema name for isolated database
      - `display_name` (text) - Human-readable database name
      - `project_id` (text) - Associated project ID
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `database_nodes` table
    - Users can only access their own database nodes
    - Proper isolation per user

  3. Purpose
    - Track database schemas created for each database node
    - Enable automatic cleanup when nodes are deleted
    - Store metadata about each isolated database
    - Ensure each user has isolated database environments
*/

-- Create database_nodes table (for fresh installs; may already exist from earlier migration)
CREATE TABLE IF NOT EXISTS database_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  schema_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  project_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- If table was created by 20260225143639 (no user_id), add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'database_nodes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE database_nodes ADD COLUMN user_id uuid;
    UPDATE database_nodes SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
    ALTER TABLE database_nodes ALTER COLUMN user_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'database_nodes' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE database_nodes ADD COLUMN project_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'database_nodes' AND column_name = 'id'
  ) THEN
    ALTER TABLE database_nodes ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE database_nodes SET id = gen_random_uuid() WHERE id IS NULL;
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE database_nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own database nodes
DROP POLICY IF EXISTS "Users can view own database nodes" ON database_nodes;
CREATE POLICY "Users can view own database nodes"
  ON database_nodes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own database nodes" ON database_nodes;
CREATE POLICY "Users can create own database nodes"
  ON database_nodes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own database nodes" ON database_nodes;
CREATE POLICY "Users can update own database nodes"
  ON database_nodes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own database nodes" ON database_nodes;
CREATE POLICY "Users can delete own database nodes"
  ON database_nodes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS on_database_nodes_updated ON database_nodes;
CREATE TRIGGER on_database_nodes_updated
  BEFORE UPDATE ON database_nodes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS database_nodes_node_id_idx ON database_nodes(node_id);
CREATE INDEX IF NOT EXISTS database_nodes_user_id_idx ON database_nodes(user_id);
CREATE INDEX IF NOT EXISTS database_nodes_schema_name_idx ON database_nodes(schema_name);
CREATE INDEX IF NOT EXISTS database_nodes_project_id_idx ON database_nodes(project_id);
CREATE INDEX IF NOT EXISTS database_nodes_created_at_idx ON database_nodes(created_at);
