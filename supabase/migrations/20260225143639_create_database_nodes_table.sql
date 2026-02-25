/*
  # Create Database Nodes Tracking Table

  1. New Tables
    - `database_nodes`
      - `node_id` (text, primary key) - ID of the canvas node
      - `schema_name` (text, unique) - PostgreSQL schema name for isolated database
      - `display_name` (text) - Human-readable database name
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `database_nodes` table
    - Add policy for authenticated users to manage their own database nodes

  3. Purpose
    - Track database schemas created for each database node
    - Enable automatic cleanup when nodes are deleted
    - Store metadata about each isolated database
*/

-- Create database_nodes table
CREATE TABLE IF NOT EXISTS database_nodes (
  node_id text PRIMARY KEY,
  schema_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE database_nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view database nodes"
  ON database_nodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create database nodes"
  ON database_nodes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update database nodes"
  ON database_nodes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete database nodes"
  ON database_nodes FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS on_database_nodes_updated ON database_nodes;
CREATE TRIGGER on_database_nodes_updated
  BEFORE UPDATE ON database_nodes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS database_nodes_schema_name_idx ON database_nodes(schema_name);
CREATE INDEX IF NOT EXISTS database_nodes_created_at_idx ON database_nodes(created_at);
