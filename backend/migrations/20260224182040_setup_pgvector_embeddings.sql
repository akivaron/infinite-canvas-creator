/*
  # Setup pgvector and embeddings tables

  1. Extensions
    - Enable pgvector for vector similarity search

  2. New Tables
    - `code_embeddings` - Vector embeddings for code files
    - `canvas_node_embeddings` - Vector embeddings for canvas nodes
    - `conversation_embeddings` - Vector embeddings for conversations

  3. Indexes
    - Vector similarity indexes using ivfflat
    - B-tree indexes on foreign keys
    - GIN indexes for JSONB metadata

  4. Security
    - Enable RLS on all tables
    - Add policies for public access (simplified for MVP)
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Code embeddings table
CREATE TABLE IF NOT EXISTS code_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content text NOT NULL,
  embedding vector(384),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Canvas node embeddings table
CREATE TABLE IF NOT EXISTS canvas_node_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  content text NOT NULL,
  embedding vector(384),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation embeddings table
CREATE TABLE IF NOT EXISTS conversation_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  turn_id text NOT NULL,
  content text NOT NULL,
  embedding vector(384),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for fast similarity search
CREATE INDEX IF NOT EXISTS code_embeddings_embedding_idx 
  ON code_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS canvas_node_embeddings_embedding_idx 
  ON canvas_node_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS conversation_embeddings_embedding_idx 
  ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Additional indexes
CREATE INDEX IF NOT EXISTS code_embeddings_project_id_idx ON code_embeddings(project_id);
CREATE INDEX IF NOT EXISTS code_embeddings_file_path_idx ON code_embeddings(file_path);
CREATE INDEX IF NOT EXISTS canvas_node_embeddings_project_id_idx ON canvas_node_embeddings(project_id);
CREATE INDEX IF NOT EXISTS canvas_node_embeddings_node_id_idx ON canvas_node_embeddings(node_id);
CREATE INDEX IF NOT EXISTS conversation_embeddings_session_id_idx ON conversation_embeddings(session_id);

-- GIN indexes for metadata JSONB queries
CREATE INDEX IF NOT EXISTS code_embeddings_metadata_idx ON code_embeddings USING gin(metadata);
CREATE INDEX IF NOT EXISTS canvas_node_embeddings_metadata_idx ON canvas_node_embeddings USING gin(metadata);
CREATE INDEX IF NOT EXISTS conversation_embeddings_metadata_idx ON conversation_embeddings USING gin(metadata);

-- Enable RLS
ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_node_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- Public access policies (simplified)
DROP POLICY IF EXISTS "Anyone can view code embeddings" ON code_embeddings;
CREATE POLICY "Anyone can view code embeddings"
  ON code_embeddings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert code embeddings" ON code_embeddings;
CREATE POLICY "Anyone can insert code embeddings"
  ON code_embeddings FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update code embeddings" ON code_embeddings;
CREATE POLICY "Anyone can update code embeddings"
  ON code_embeddings FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete code embeddings" ON code_embeddings;
CREATE POLICY "Anyone can delete code embeddings"
  ON code_embeddings FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can view canvas node embeddings" ON canvas_node_embeddings;
CREATE POLICY "Anyone can view canvas node embeddings"
  ON canvas_node_embeddings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert canvas node embeddings" ON canvas_node_embeddings;
CREATE POLICY "Anyone can insert canvas node embeddings"
  ON canvas_node_embeddings FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update canvas node embeddings" ON canvas_node_embeddings;
CREATE POLICY "Anyone can update canvas node embeddings"
  ON canvas_node_embeddings FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete canvas node embeddings" ON canvas_node_embeddings;
CREATE POLICY "Anyone can delete canvas node embeddings"
  ON canvas_node_embeddings FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can view conversation embeddings" ON conversation_embeddings;
CREATE POLICY "Anyone can view conversation embeddings"
  ON conversation_embeddings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert conversation embeddings" ON conversation_embeddings;
CREATE POLICY "Anyone can insert conversation embeddings"
  ON conversation_embeddings FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete conversation embeddings" ON conversation_embeddings;
CREATE POLICY "Anyone can delete conversation embeddings"
  ON conversation_embeddings FOR DELETE
  TO public
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_code_embeddings_updated_at ON code_embeddings;
CREATE TRIGGER update_code_embeddings_updated_at 
  BEFORE UPDATE ON code_embeddings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_node_embeddings_updated_at ON canvas_node_embeddings;
CREATE TRIGGER update_canvas_node_embeddings_updated_at 
  BEFORE UPDATE ON canvas_node_embeddings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for semantic search of code
CREATE OR REPLACE FUNCTION search_code_embeddings(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  file_path text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    code_embeddings.id,
    code_embeddings.project_id,
    code_embeddings.file_path,
    code_embeddings.content,
    code_embeddings.metadata,
    1 - (code_embeddings.embedding <=> query_embedding) AS similarity
  FROM code_embeddings
  WHERE 
    (filter_project_id IS NULL OR code_embeddings.project_id = filter_project_id)
    AND 1 - (code_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY code_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for semantic search of canvas nodes
CREATE OR REPLACE FUNCTION search_canvas_node_embeddings(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  node_id text,
  project_id uuid,
  node_type text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    canvas_node_embeddings.id,
    canvas_node_embeddings.node_id,
    canvas_node_embeddings.project_id,
    canvas_node_embeddings.node_type,
    canvas_node_embeddings.content,
    canvas_node_embeddings.metadata,
    1 - (canvas_node_embeddings.embedding <=> query_embedding) AS similarity
  FROM canvas_node_embeddings
  WHERE 
    (filter_project_id IS NULL OR canvas_node_embeddings.project_id = filter_project_id)
    AND 1 - (canvas_node_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY canvas_node_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for semantic search of conversations
CREATE OR REPLACE FUNCTION search_conversation_embeddings(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_session_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id text,
  turn_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    conversation_embeddings.id,
    conversation_embeddings.session_id,
    conversation_embeddings.turn_id,
    conversation_embeddings.content,
    conversation_embeddings.metadata,
    1 - (conversation_embeddings.embedding <=> query_embedding) AS similarity
  FROM conversation_embeddings
  WHERE 
    (filter_session_id IS NULL OR conversation_embeddings.session_id = filter_session_id)
    AND 1 - (conversation_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY conversation_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;