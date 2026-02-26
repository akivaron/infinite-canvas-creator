import { Router, Request, Response } from 'express';
import db from '../config/database.js';

const router = Router();
const ACTIVITY_LIMIT = 20;

/** GET /api/collaboration/initial?projectId= - collaborators + activity + active users (single request) */
router.get('/initial', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [collaboratorsRes, activityRes, presenceRes] = await Promise.all([
      db.query('SELECT * FROM project_collaborators WHERE project_id = $1', [projectId]),
      db.query(
        'SELECT * FROM project_activity WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
        [projectId, ACTIVITY_LIMIT]
      ),
      db.query(
        'SELECT * FROM user_presence WHERE project_id = $1 AND last_active > $2',
        [projectId, fiveMinutesAgo]
      ),
    ]);

    res.json({
      collaborators: collaboratorsRes.rows ?? [],
      activity: activityRes.rows ?? [],
      activeUsers: presenceRes.rows ?? [],
    });
  } catch (error) {
    console.error('Collaboration initial error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load collaboration data',
    });
  }
});

/** GET /api/collaboration/refresh?projectId= - activity + active users */
router.get('/refresh', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [activityRes, presenceRes] = await Promise.all([
      db.query(
        'SELECT * FROM project_activity WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
        [projectId, ACTIVITY_LIMIT]
      ),
      db.query(
        'SELECT * FROM user_presence WHERE project_id = $1 AND last_active > $2',
        [projectId, fiveMinutesAgo]
      ),
    ]);

    res.json({
      activity: activityRes.rows ?? [],
      activeUsers: presenceRes.rows ?? [],
    });
  } catch (error) {
    console.error('Collaboration refresh error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to refresh',
    });
  }
});

/** GET /api/collaboration/collaborators?projectId= */
router.get('/collaborators', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    const result = await db.query('SELECT * FROM project_collaborators WHERE project_id = $1', [projectId]);
    res.json({ data: result.rows ?? [] });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load collaborators' });
  }
});

/** POST /api/collaboration/invite - body: { projectId, email, role, userId } */
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const { projectId, email, role, userId } = req.body;
    if (!projectId || !email || !role || !userId) {
      return res.status(400).json({ error: 'projectId, email, role, userId are required' });
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const insertInv = await db.query(
      `INSERT INTO project_invitations (project_id, email, role, token, invited_by, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [projectId, email, role, token, userId, expiresAt]
    );
    const invitation = insertInv.rows[0];
    if (!invitation) {
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    await db.query(
      `INSERT INTO project_activity (project_id, user_id, action_type, entity_type, details)
       VALUES ($1, $2, 'invite_sent', 'invitation', $3)`,
      [projectId, userId, JSON.stringify({ email, role })]
    );

    res.status(201).json({ data: invitation });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to invite' });
  }
});

/** POST /api/collaboration/accept - body: { token, userId } */
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body;
    if (!token || !userId) return res.status(400).json({ error: 'token and userId are required' });

    const invRes = await db.query(
      'SELECT * FROM project_invitations WHERE token = $1 AND status = $2',
      [token, 'pending']
    );
    const invitation = invRes.rows[0];
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already accepted' });
    }
    if (new Date(invitation.expires_at) < new Date()) {
      await db.query('UPDATE project_invitations SET status = $1 WHERE id = $2', ['expired', invitation.id]);
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO project_collaborators (project_id, user_id, role, invited_by, status, accepted_at)
       VALUES ($1, $2, $3, $4, 'accepted', $5)`,
      [invitation.project_id, userId, invitation.role, invitation.invited_by, now]
    );
    await db.query(
      'UPDATE project_invitations SET status = $1, accepted_at = $2 WHERE id = $3',
      ['accepted', now, invitation.id]
    );
    await db.query(
      `INSERT INTO project_activity (project_id, user_id, action_type, entity_type)
       VALUES ($1, $2, 'invitation_accepted', 'collaborator')`,
      [invitation.project_id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to accept' });
  }
});

/** POST /api/collaboration/remove - body: { projectId, collaboratorId, userId } */
router.post('/remove', async (req: Request, res: Response) => {
  try {
    const { projectId, collaboratorId, userId } = req.body;
    if (!projectId || !collaboratorId || !userId) {
      return res.status(400).json({ error: 'projectId, collaboratorId, userId are required' });
    }
    await db.query('DELETE FROM project_collaborators WHERE id = $1', [collaboratorId]);
    await db.query(
      `INSERT INTO project_activity (project_id, user_id, action_type, entity_type, entity_id)
       VALUES ($1, $2, 'collaborator_removed', 'collaborator', $3)`,
      [projectId, userId, collaboratorId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove' });
  }
});

/** PATCH /api/collaboration/role - body: { collaboratorId, newRole } */
router.patch('/role', async (req: Request, res: Response) => {
  try {
    const { collaboratorId, newRole } = req.body;
    if (!collaboratorId || !newRole) return res.status(400).json({ error: 'collaboratorId and newRole are required' });
    await db.query('UPDATE project_collaborators SET role = $1 WHERE id = $2', [newRole, collaboratorId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update role' });
  }
});

/** PUT /api/collaboration/presence - body: { projectId, userId, cursor_x?, cursor_y?, selected_node_id?, user_name?, user_email?, color? } */
router.put('/presence', async (req: Request, res: Response) => {
  try {
    const { projectId, userId, cursor_x, cursor_y, selected_node_id, user_name, user_email, color } = req.body;
    if (!projectId || !userId) return res.status(400).json({ error: 'projectId and userId are required' });
    const lastActive = new Date().toISOString();

    await db.query(
      `INSERT INTO user_presence (project_id, user_id, last_active, cursor_x, cursor_y, selected_node_id, user_name, user_email, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (project_id, user_id) DO UPDATE SET
         cursor_x = COALESCE(EXCLUDED.cursor_x, user_presence.cursor_x),
         cursor_y = COALESCE(EXCLUDED.cursor_y, user_presence.cursor_y),
         selected_node_id = EXCLUDED.selected_node_id,
         user_name = COALESCE(EXCLUDED.user_name, user_presence.user_name),
         user_email = COALESCE(EXCLUDED.user_email, user_presence.user_email),
         color = COALESCE(EXCLUDED.color, user_presence.color),
         last_active = EXCLUDED.last_active`,
      [
        projectId,
        userId,
        lastActive,
        cursor_x ?? 0,
        cursor_y ?? 0,
        selected_node_id ?? null,
        user_name ?? null,
        user_email ?? null,
        color ?? '#3b82f6',
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update presence error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update presence' });
  }
});

/** GET /api/collaboration/activity?projectId=&limit=20 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const limit = Math.min(Number(req.query.limit) || ACTIVITY_LIMIT, 100);
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    const result = await db.query(
      'SELECT * FROM project_activity WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
      [projectId, limit]
    );
    res.json({ data: result.rows ?? [] });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load activity' });
  }
});

/** GET /api/collaboration/permission?projectId=&userId= */
router.get('/permission', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const userId = req.query.userId as string;
    if (!projectId || !userId) return res.status(400).json({ error: 'projectId and userId are required' });
    const result = await db.query(
      'SELECT role FROM project_collaborators WHERE project_id = $1 AND user_id = $2 AND status = $3',
      [projectId, userId, 'accepted']
    );
    const role = result.rows[0]?.role ?? null;
    res.json({ data: role });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check permission' });
  }
});

/** GET /api/collaboration/invitations?projectId= */
router.get('/invitations', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    const result = await db.query(
      'SELECT * FROM project_invitations WHERE project_id = $1 AND status = $2',
      [projectId, 'pending']
    );
    res.json({ data: result.rows ?? [] });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load invitations' });
  }
});

/** POST /api/collaboration/revoke-invitation - body: { invitationId } */
router.post('/revoke-invitation', async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.body;
    if (!invitationId) return res.status(400).json({ error: 'invitationId is required' });
    await db.query('UPDATE project_invitations SET status = $1 WHERE id = $2', ['revoked', invitationId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to revoke' });
  }
});

/** POST /api/collaboration/log-activity - body: { projectId, userId, actionType, entityType, entityId?, metadata? } */
router.post('/log-activity', async (req: Request, res: Response) => {
  try {
    const { projectId, userId, actionType, entityType, entityId, metadata } = req.body;
    if (!projectId || !actionType || !entityType) {
      return res.status(400).json({ error: 'projectId, actionType, entityType are required' });
    }
    await db.query(
      `INSERT INTO project_activity (project_id, user_id, action_type, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectId, userId ?? null, actionType, entityType, entityId ?? null, metadata ? JSON.stringify(metadata) : '{}']
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to log activity' });
  }
});

export default router;
