/*
  # Create projects and generated files tables

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, default '')
      - `canvas_data` (jsonb) - stores the full canvas state (nodes, connections)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `generated_files`
      - `id` (uuid, primary key)
      - `project_id` (uuid, FK to projects)
      - `node_id` (text, not null) - canvas node ID
      - `platform` (text, not null) - web, mobile, api, desktop, cli, database
      - `file_path` (text, not null) - e.g. src/App.tsx
      - `file_content` (text, default '')
      - `language` (text, default 'text')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Allow anonymous access for now (no auth required per user request)
    - Policies restrict to anon role for read/write
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  canvas_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select projects" ON projects;
CREATE POLICY "Allow anon select projects"
  ON projects FOR SELECT
  TO anon
  USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon insert projects" ON projects;
CREATE POLICY "Allow anon insert projects"
  ON projects FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon update projects" ON projects;
CREATE POLICY "Allow anon update projects"
  ON projects FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon delete projects" ON projects;
CREATE POLICY "Allow anon delete projects"
  ON projects FOR DELETE
  TO anon
  USING (id IS NOT NULL);

CREATE TABLE IF NOT EXISTS generated_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  file_path text NOT NULL,
  file_content text DEFAULT '',
  language text DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure node_id column exists even if table was created earlier without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'generated_files'
      AND column_name = 'node_id'
  ) THEN
    ALTER TABLE generated_files ADD COLUMN node_id text;
  END IF;
END;
$$;

ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select generated_files" ON generated_files;
CREATE POLICY "Allow anon select generated_files"
  ON generated_files FOR SELECT
  TO anon
  USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon insert generated_files" ON generated_files;
CREATE POLICY "Allow anon insert generated_files"
  ON generated_files FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon update generated_files" ON generated_files;
CREATE POLICY "Allow anon update generated_files"
  ON generated_files FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon delete generated_files" ON generated_files;
CREATE POLICY "Allow anon delete generated_files"
  ON generated_files FOR DELETE
  TO anon
  USING (id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_generated_files_node_id ON generated_files(node_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_project_id ON generated_files(project_id);
