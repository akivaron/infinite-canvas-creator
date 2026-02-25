/*
  # Enhanced Canvas Nodes and Projects Schema

  1. New Tables
    - `canvas_projects` - Enhanced project management
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `thumbnail` (text) - URL to preview image
      - `tags` (text[]) - Searchable tags
      - `is_public` (boolean)
      - `fork_count` (integer)
      - `view_count` (integer)
      - `star_count` (integer)
      - `metadata` (jsonb) - Framework, language, etc
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `canvas_nodes` - Visual canvas nodes
      - `id` (uuid, primary key)
      - `project_id` (uuid, references canvas_projects)
      - `node_id` (text) - Frontend node ID
      - `node_type` (text) - code, visual, api, database, etc
      - `position_x` (float)
      - `position_y` (float)
      - `width` (float)
      - `height` (float)
      - `data` (jsonb) - Node properties, code, prompt, etc
      - `metadata` (jsonb) - Additional info
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `canvas_connections` - Connections between nodes
      - `id` (uuid, primary key)
      - `project_id` (uuid, references canvas_projects)
      - `source_node_id` (text)
      - `target_node_id` (text)
      - `connection_type` (text) - data, control, visual
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
    
    - `project_versions` - Version history
      - `id` (uuid, primary key)
      - `project_id` (uuid, references canvas_projects)
      - `version_number` (integer)
      - `snapshot` (jsonb) - Full project state
      - `changes` (text) - Description of changes
      - `created_by` (uuid)
      - `created_at` (timestamptz)
    
    - `project_collaborators` - Team collaboration
      - `id` (uuid, primary key)
      - `project_id` (uuid, references canvas_projects)
      - `user_id` (uuid)
      - `role` (text) - owner, editor, viewer
      - `invited_by` (uuid)
      - `joined_at` (timestamptz)
    
    - `project_stars` - User favorites
      - `id` (uuid, primary key)
      - `project_id` (uuid, references canvas_projects)
      - `user_id` (uuid)
      - `created_at` (timestamptz)

  2. Indexes
    - Performance indexes on foreign keys
    - Text search indexes
    - Composite indexes for queries

  3. Security
    - Enable RLS on all tables
    - Project-based access control
    - Collaboration permissions
*/

-- Canvas Projects table (local Postgres version, no auth schema)
CREATE TABLE IF NOT EXISTS canvas_projects (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text NOT NULL DEFAULT 'Untitled Project',
  description text DEFAULT '',
  thumbnail text,
  tags text[] DEFAULT ARRAY[]::text[],
  is_public boolean DEFAULT false,
  fork_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  star_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canvas_nodes (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES canvas_projects(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  width float DEFAULT 200,
  height float DEFAULT 100,
  data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, node_id)
);

-- Ensure node_id and node_type columns exist even if canvas_nodes was created earlier without them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'canvas_nodes'
      AND column_name = 'node_id'
  ) THEN
    ALTER TABLE canvas_nodes ADD COLUMN node_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'canvas_nodes'
      AND column_name = 'node_type'
  ) THEN
    ALTER TABLE canvas_nodes ADD COLUMN node_type text;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS canvas_connections (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES canvas_projects(id) ON DELETE CASCADE,
  source_node_id text NOT NULL,
  target_node_id text NOT NULL,
  connection_type text DEFAULT 'data',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_versions (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES canvas_projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  changes text DEFAULT '',
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_collaborators (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES canvas_projects(id) ON DELETE CASCADE,
  user_id text,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by text,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_stars (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES canvas_projects(id) ON DELETE CASCADE,
  user_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS canvas_projects_user_id_idx ON canvas_projects(user_id);
CREATE INDEX IF NOT EXISTS canvas_projects_is_public_idx ON canvas_projects(is_public);
CREATE INDEX IF NOT EXISTS canvas_projects_tags_idx ON canvas_projects USING gin(tags);
CREATE INDEX IF NOT EXISTS canvas_projects_created_at_idx ON canvas_projects(created_at DESC);

CREATE INDEX IF NOT EXISTS canvas_nodes_project_id_idx ON canvas_nodes(project_id);
CREATE INDEX IF NOT EXISTS canvas_nodes_node_id_idx ON canvas_nodes(node_id);
CREATE INDEX IF NOT EXISTS canvas_nodes_node_type_idx ON canvas_nodes(node_type);

CREATE INDEX IF NOT EXISTS canvas_connections_project_id_idx ON canvas_connections(project_id);
CREATE INDEX IF NOT EXISTS canvas_connections_source_idx ON canvas_connections(source_node_id);
CREATE INDEX IF NOT EXISTS canvas_connections_target_idx ON canvas_connections(target_node_id);

CREATE INDEX IF NOT EXISTS project_versions_project_id_idx ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS project_versions_version_idx ON project_versions(project_id, version_number DESC);

CREATE INDEX IF NOT EXISTS project_collaborators_project_id_idx ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS project_collaborators_user_id_idx ON project_collaborators(user_id);

CREATE INDEX IF NOT EXISTS project_stars_project_id_idx ON project_stars(project_id);
CREATE INDEX IF NOT EXISTS project_stars_user_id_idx ON project_stars(user_id);

-- Enable RLS
ALTER TABLE canvas_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvas_projects

-- Public projects are viewable by anyone
DROP POLICY IF EXISTS "Anyone can view public projects" ON canvas_projects;
CREATE POLICY "Anyone can view public projects"
  ON canvas_projects FOR SELECT
  TO public
  USING (is_public = true);

-- Authenticated users can view their own projects
DROP POLICY IF EXISTS "Users can view own projects" ON canvas_projects;
CREATE POLICY "Users can view own projects"
  ON canvas_projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Collaborators can view projects
DROP POLICY IF EXISTS "Collaborators can view projects" ON canvas_projects;
CREATE POLICY "Collaborators can view projects"
  ON canvas_projects FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()::text
    )
  );

-- Users can create projects
DROP POLICY IF EXISTS "Users can create projects" ON canvas_projects;
CREATE POLICY "Users can create projects"
  ON canvas_projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update own projects
DROP POLICY IF EXISTS "Users can update own projects" ON canvas_projects;
CREATE POLICY "Users can update own projects"
  ON canvas_projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Editors can update projects
DROP POLICY IF EXISTS "Editors can update projects" ON canvas_projects;
CREATE POLICY "Editors can update projects"
  ON canvas_projects FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'editor')
    )
  );

-- Users can delete own projects
DROP POLICY IF EXISTS "Users can delete own projects" ON canvas_projects;
CREATE POLICY "Users can delete own projects"
  ON canvas_projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- RLS Policies for canvas_nodes

-- View policies inherit from project
DROP POLICY IF EXISTS "Users can view nodes in accessible projects" ON canvas_nodes;
CREATE POLICY "Users can view nodes in accessible projects"
  ON canvas_nodes FOR SELECT
  TO public
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can view nodes in own projects" ON canvas_nodes;
CREATE POLICY "Users can view nodes in own projects"
  ON canvas_nodes FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Collaborators can view nodes" ON canvas_nodes;
CREATE POLICY "Collaborators can view nodes"
  ON canvas_nodes FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()::text
    )
  );

-- Edit policies for owners and editors
DROP POLICY IF EXISTS "Owners can manage nodes" ON canvas_nodes;
CREATE POLICY "Owners can manage nodes"
  ON canvas_nodes FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Editors can manage nodes" ON canvas_nodes;
CREATE POLICY "Editors can manage nodes"
  ON canvas_nodes FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'editor')
    )
  );

-- Similar policies for canvas_connections
DROP POLICY IF EXISTS "Public connections viewable" ON canvas_connections;
CREATE POLICY "Public connections viewable"
  ON canvas_connections FOR SELECT
  TO public
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can manage own project connections" ON canvas_connections;
CREATE POLICY "Users can manage own project connections"
  ON canvas_connections FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Collaborators can manage connections" ON canvas_connections;
CREATE POLICY "Collaborators can manage connections"
  ON canvas_connections FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'editor')
    )
  );

-- Policies for project_versions
DROP POLICY IF EXISTS "Users can view project versions" ON project_versions;
CREATE POLICY "Users can view project versions"
  ON project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()::text
      OR id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Users can create versions" ON project_versions;
CREATE POLICY "Users can create versions"
  ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()::text
      OR id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid()::text AND role IN ('owner', 'editor')
      )
    )
  );

-- Policies for project_collaborators
DROP POLICY IF EXISTS "Users can view collaborators" ON project_collaborators;
CREATE POLICY "Users can view collaborators"
  ON project_collaborators FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()::text
    )
    OR user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners can manage collaborators" ON project_collaborators;
CREATE POLICY "Owners can manage collaborators"
  ON project_collaborators FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()::text
    )
  );

-- Policies for project_stars
DROP POLICY IF EXISTS "Anyone can view star counts" ON project_stars;
CREATE POLICY "Anyone can view star counts"
  ON project_stars FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Users can star projects" ON project_stars;
CREATE POLICY "Users can star projects"
  ON project_stars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can unstar projects" ON project_stars;
CREATE POLICY "Users can unstar projects"
  ON project_stars FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_canvas_projects_updated_at ON canvas_projects;
CREATE TRIGGER update_canvas_projects_updated_at
  BEFORE UPDATE ON canvas_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_nodes_updated_at ON canvas_nodes;
CREATE TRIGGER update_canvas_nodes_updated_at
  BEFORE UPDATE ON canvas_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment star count
CREATE OR REPLACE FUNCTION increment_star_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE canvas_projects
  SET star_count = star_count + 1
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_star_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE canvas_projects
  SET star_count = star_count - 1
  WHERE id = OLD.project_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_starred ON project_stars;
CREATE TRIGGER project_starred
  AFTER INSERT ON project_stars
  FOR EACH ROW EXECUTE FUNCTION increment_star_count();

DROP TRIGGER IF EXISTS project_unstarred ON project_stars;
CREATE TRIGGER project_unstarred
  AFTER DELETE ON project_stars
  FOR EACH ROW EXECUTE FUNCTION decrement_star_count();

-- Function to auto-create version on project save
CREATE OR REPLACE FUNCTION create_project_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
  project_snapshot jsonb;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM project_versions
  WHERE project_id = NEW.id;

  -- Build snapshot
  project_snapshot := jsonb_build_object(
    'project', row_to_json(NEW),
    'nodes', (
      SELECT json_agg(row_to_json(n))
      FROM canvas_nodes n
      WHERE n.project_id = NEW.id
    ),
    'connections', (
      SELECT json_agg(row_to_json(c))
      FROM canvas_connections c
      WHERE c.project_id = NEW.id
    )
  );

  -- Insert version
  INSERT INTO project_versions (
    project_id,
    version_number,
    snapshot,
    changes,
    created_by
  ) VALUES (
    NEW.id,
    next_version,
    project_snapshot,
    'Auto-save',
    NEW.user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create version on update (optional, can be manual)
-- CREATE TRIGGER auto_version_project
--   AFTER UPDATE ON canvas_projects
--   FOR EACH ROW EXECUTE FUNCTION create_project_version();