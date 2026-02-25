CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects
CREATE TABLE IF NOT EXISTS canvas_projects (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  thumbnail    TEXT,
  tags         TEXT[],
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata     JSONB   DEFAULT '{}'::jsonb,
  view_count   INTEGER NOT NULL DEFAULT 0,
  nodes_data   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nodes
CREATE TABLE IF NOT EXISTS canvas_nodes (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  position_x   INTEGER NOT NULL,
  position_y   INTEGER NOT NULL,
  data         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connections
CREATE TABLE IF NOT EXISTS canvas_connections (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     TEXT NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS project_activity (
  id          BIGSERIAL PRIMARY KEY,
  project_id  TEXT NOT NULL,
  user_id     TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project_id_created_at
  ON project_activity (project_id, created_at DESC);

-- User presence (for collaboration cursors)
CREATE TABLE IF NOT EXISTS user_presence (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  user_name       TEXT,
  user_email      TEXT,
  cursor_x        DOUBLE PRECISION DEFAULT 0,
  cursor_y        DOUBLE PRECISION DEFAULT 0,
  selected_node_id TEXT,
  color           TEXT NOT NULL DEFAULT '#3b82f6',
  last_active     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_project_id
  ON user_presence (project_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_active
  ON user_presence (last_active DESC);

