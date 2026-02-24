/*
  # Add Collaboration Features

  ## Changes
  1. Add status column to project_collaborators
  2. Add accepted_at column
  3. Create project_invitations table
  4. Create project_activity table
  5. Create user_presence table
  6. Update RLS policies

  ## Security
  - RLS enabled on all tables
  - Proper access controls based on roles
*/

-- ============================================================================
-- Update project_collaborators table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_collaborators' AND column_name = 'status'
  ) THEN
    ALTER TABLE project_collaborators ADD COLUMN status text DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_collaborators' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE project_collaborators ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_collaborators' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE project_collaborators ADD COLUMN invited_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing records to have accepted status and timestamp
UPDATE project_collaborators
SET status = 'accepted', accepted_at = joined_at
WHERE status IS NULL;

-- ============================================================================
-- project_invitations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('editor', 'viewer')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations they sent"
  ON project_invitations FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = project_invitations.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role = 'owner'
      AND project_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Project owners can create invitations"
  ON project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = project_invitations.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role = 'owner'
      AND project_collaborators.status = 'accepted'
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "Project owners can update invitations"
  ON project_invitations FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = project_invitations.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role = 'owner'
      AND project_collaborators.status = 'accepted'
    )
  );

-- ============================================================================
-- project_activity table
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity(created_at DESC);

ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view project activity"
  ON project_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = project_activity.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Collaborators can create activity logs"
  ON project_activity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = project_activity.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.status = 'accepted'
    )
    AND user_id = auth.uid()
  );

-- ============================================================================
-- user_presence table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text,
  user_email text,
  cursor_x float DEFAULT 0,
  cursor_y float DEFAULT 0,
  selected_node_id text,
  color text NOT NULL DEFAULT '#3b82f6',
  last_active timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_presence_project_id ON user_presence(project_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON user_presence(last_active DESC);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = user_presence.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Users can insert their own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = user_presence.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Users can update their presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their presence"
  ON user_presence FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Update project_versions table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_versions' AND column_name = 'tag'
  ) THEN
    ALTER TABLE project_versions ADD COLUMN tag text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_versions' AND column_name = 'changes_summary'
  ) THEN
    ALTER TABLE project_versions ADD COLUMN changes_summary text DEFAULT '';
  END IF;
END $$;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to cleanup old presence records
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM user_presence
  WHERE last_active < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_project_id uuid)
RETURNS integer AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM project_versions
  WHERE project_id = p_project_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_invitation RECORD;
  v_result jsonb;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Add collaborator
  INSERT INTO project_collaborators (project_id, user_id, role, invited_by, invited_at, accepted_at, status)
  VALUES (v_invitation.project_id, auth.uid(), v_invitation.role, v_invitation.invited_by, v_invitation.created_at, now(), 'accepted')
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, accepted_at = now(), status = 'accepted';
  
  -- Update invitation
  UPDATE project_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;
  
  -- Log activity
  INSERT INTO project_activity (project_id, user_id, action_type, entity_type, entity_id, details)
  VALUES (
    v_invitation.project_id,
    auth.uid(),
    'joined',
    'project',
    v_invitation.project_id::text,
    jsonb_build_object('role', v_invitation.role)
  );
  
  RETURN jsonb_build_object('success', true, 'project_id', v_invitation.project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
