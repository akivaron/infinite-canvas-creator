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

-- Canvas Projects table
CREATE TABLE IF NOT EXISTS canvas_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Canvas Nodes table
CREATE TABLE IF NOT EXISTS canvas_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
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

-- Canvas Connections table
CREATE TABLE IF NOT EXISTS canvas_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
  source_node_id text NOT NULL,
  target_node_id text NOT NULL,
  connection_type text DEFAULT 'data',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Project Versions table
CREATE TABLE IF NOT EXISTS project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  changes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Project Collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Project Stars table
CREATE TABLE IF NOT EXISTS project_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE POLICY "Anyone can view public projects"
  ON canvas_projects FOR SELECT
  TO public
  USING (is_public = true);

-- Authenticated users can view their own projects
CREATE POLICY "Users can view own projects"
  ON canvas_projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Collaborators can view projects
CREATE POLICY "Collaborators can view projects"
  ON canvas_projects FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()
    )
  );

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON canvas_projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own projects
CREATE POLICY "Users can update own projects"
  ON canvas_projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Editors can update projects
CREATE POLICY "Editors can update projects"
  ON canvas_projects FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Users can delete own projects
CREATE POLICY "Users can delete own projects"
  ON canvas_projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for canvas_nodes

-- View policies inherit from project
CREATE POLICY "Users can view nodes in accessible projects"
  ON canvas_nodes FOR SELECT
  TO public
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE is_public = true
    )
  );

CREATE POLICY "Users can view nodes in own projects"
  ON canvas_nodes FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can view nodes"
  ON canvas_nodes FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()
    )
  );

-- Edit policies for owners and editors
CREATE POLICY "Owners can manage nodes"
  ON canvas_nodes FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage nodes"
  ON canvas_nodes FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Similar policies for canvas_connections
CREATE POLICY "Public connections viewable"
  ON canvas_connections FOR SELECT
  TO public
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE is_public = true
    )
  );

CREATE POLICY "Users can manage own project connections"
  ON canvas_connections FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can manage connections"
  ON canvas_connections FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Policies for project_versions
CREATE POLICY "Users can view project versions"
  ON project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()
      OR id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create versions"
  ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM canvas_projects
      WHERE user_id = auth.uid()
      OR id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );

-- Policies for project_collaborators
CREATE POLICY "Users can view collaborators"
  ON project_collaborators FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can manage collaborators"
  ON project_collaborators FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM canvas_projects WHERE user_id = auth.uid()
    )
  );

-- Policies for project_stars
CREATE POLICY "Anyone can view star counts"
  ON project_stars FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can star projects"
  ON project_stars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unstar projects"
  ON project_stars FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_canvas_projects_updated_at
  BEFORE UPDATE ON canvas_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER project_starred
  AFTER INSERT ON project_stars
  FOR EACH ROW EXECUTE FUNCTION increment_star_count();

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