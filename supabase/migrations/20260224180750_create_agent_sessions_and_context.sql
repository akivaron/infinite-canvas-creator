/*
  # Agent Sessions and Context Storage

  1. New Tables
    - `agent_sessions`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `context` (jsonb) - Stores code context, file structure, etc.
      - `history` (jsonb) - Generation request history
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `agent_generations`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references agent_sessions)
      - `prompt` (text)
      - `mode` (text) - generate, edit, complete, explain
      - `context` (jsonb)
      - `response` (jsonb)
      - `model` (text)
      - `tokens_used` (integer)
      - `duration_ms` (integer)
      - `created_at` (timestamptz)
    
    - `code_context_cache`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `file_path` (text)
      - `content_hash` (text)
      - `analysis` (jsonb) - Imports, exports, dependencies
      - `last_analyzed` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Allow anonymous access (matching projects table policy)
*/

-- Agent Sessions Table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  context jsonb DEFAULT '{}'::jsonb,
  history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select agent_sessions"
  ON agent_sessions FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Allow anon insert agent_sessions"
  ON agent_sessions FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Allow anon update agent_sessions"
  ON agent_sessions FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Allow anon delete agent_sessions"
  ON agent_sessions FOR DELETE
  TO anon
  USING (id IS NOT NULL);

-- Agent Generations Table
CREATE TABLE IF NOT EXISTS agent_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES agent_sessions(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  mode text NOT NULL DEFAULT 'generate',
  context jsonb DEFAULT '{}'::jsonb,
  response jsonb DEFAULT '{}'::jsonb,
  model text,
  tokens_used integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select agent_generations"
  ON agent_generations FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Allow anon insert agent_generations"
  ON agent_generations FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

-- Code Context Cache Table
CREATE TABLE IF NOT EXISTS code_context_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content_hash text NOT NULL,
  analysis jsonb DEFAULT '{}'::jsonb,
  last_analyzed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, file_path)
);

ALTER TABLE code_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select code_context_cache"
  ON code_context_cache FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Allow anon insert code_context_cache"
  ON code_context_cache FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Allow anon update code_context_cache"
  ON code_context_cache FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_project_id ON agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_generations_session_id ON agent_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_code_context_cache_project_id ON code_context_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_code_context_cache_file_path ON code_context_cache(file_path);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_agent_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_agent_sessions_updated_at
      BEFORE UPDATE ON agent_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
