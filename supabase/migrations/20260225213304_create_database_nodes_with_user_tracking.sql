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

-- Create database_nodes table
CREATE TABLE IF NOT EXISTS database_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schema_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  project_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE database_nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own database nodes
CREATE POLICY "Users can view own database nodes"
  ON database_nodes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own database nodes"
  ON database_nodes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own database nodes"
  ON database_nodes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own database nodes"
  ON database_nodes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER on_database_nodes_updated
  BEFORE UPDATE ON database_nodes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS database_nodes_node_id_idx ON database_nodes(node_id);
CREATE INDEX IF NOT EXISTS database_nodes_user_id_idx ON database_nodes(user_id);
CREATE INDEX IF NOT EXISTS database_nodes_schema_name_idx ON database_nodes(schema_name);
CREATE INDEX IF NOT EXISTS database_nodes_project_id_idx ON database_nodes(project_id);
CREATE INDEX IF NOT EXISTS database_nodes_created_at_idx ON database_nodes(created_at);
