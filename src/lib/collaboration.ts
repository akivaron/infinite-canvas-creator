import { db } from './db';

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  user?: {
    id: string;
    email: string;
  };
}

export interface Invitation {
  id: string;
  project_id: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface UserPresence {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  cursor_x: number;
  cursor_y: number;
  selected_node_id?: string;
  color: string;
  last_active: string;
}

export interface Activity {
  id: string;
  project_id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  metadata?: any;
  created_at: string;
}

export async function getProjectCollaborators(projectId: string): Promise<Collaborator[]> {
  try {
    const result = await db.from('project_collaborators')
      .select('*')
      .eq('project_id', projectId)
      .execute();

    return result.data || [];
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return [];
  }
}

export async function inviteCollaborator(
  projectId: string,
  email: string,
  role: 'editor' | 'viewer',
  userId: string
): Promise<Invitation | null> {
  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await db.from('project_invitations')
      .insert({
        project_id: projectId,
        email,
        role,
        token,
        invited_by: userId,
        expires_at: expiresAt,
        status: 'pending'
      })
      .execute();

    if (result.error) {
      throw result.error;
    }

    await db.from('project_activity')
      .insert({
        project_id: projectId,
        user_id: userId,
        action_type: 'invite_sent',
        entity_type: 'invitation',
        metadata: { email, role }
      })
      .execute();

    return result.data?.[0] || null;
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    return null;
  }
}

export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  try {
    const invitationResult = await db.from('project_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (!invitationResult.data) {
      throw new Error('Invitation not found or already accepted');
    }

    const invitation = invitationResult.data;

    if (new Date(invitation.expires_at) < new Date()) {
      await db.from('project_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
        .execute();
      throw new Error('Invitation has expired');
    }

    await db.from('project_collaborators')
      .insert({
        project_id: invitation.project_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .execute();

    await db.from('project_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
      .execute();

    await db.from('project_activity')
      .insert({
        project_id: invitation.project_id,
        user_id: userId,
        action_type: 'invitation_accepted',
        entity_type: 'collaborator'
      })
      .execute();

    return true;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return false;
  }
}

export async function removeCollaborator(
  projectId: string,
  collaboratorId: string,
  userId: string
): Promise<boolean> {
  try {
    await db.from('project_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .execute();

    await db.from('project_activity')
      .insert({
        project_id: projectId,
        user_id: userId,
        action_type: 'collaborator_removed',
        entity_type: 'collaborator',
        entity_id: collaboratorId
      })
      .execute();

    return true;
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return false;
  }
}

export async function updateCollaboratorRole(
  collaboratorId: string,
  newRole: 'editor' | 'viewer'
): Promise<boolean> {
  try {
    await db.from('project_collaborators')
      .update({ role: newRole })
      .eq('id', collaboratorId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error updating collaborator role:', error);
    return false;
  }
}

export async function updateUserPresence(
  projectId: string,
  userId: string,
  presence: Partial<UserPresence>
): Promise<void> {
  try {
    await db.from('user_presence')
      .upsert({
        project_id: projectId,
        user_id: userId,
        ...presence,
        last_active: new Date().toISOString()
      })
      .execute();
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

export async function getActiveUsers(projectId: string): Promise<UserPresence[]> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const result = await db.from('user_presence')
      .select('*')
      .eq('project_id', projectId)
      .gt('last_active', fiveMinutesAgo)
      .execute();

    return result.data || [];
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
}

export async function logActivity(
  projectId: string,
  userId: string,
  actionType: string,
  entityType: string,
  entityId?: string,
  metadata?: any
): Promise<void> {
  try {
    await db.from('project_activity')
      .insert({
        project_id: projectId,
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata
      })
      .execute();
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function getProjectActivity(
  projectId: string,
  limit: number = 50
): Promise<Activity[]> {
  try {
    const result = await db.from('project_activity')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .execute();

    return result.data || [];
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
}

export async function checkUserPermission(
  projectId: string,
  userId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  try {
    const result = await db.from('project_collaborators')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .single();

    return result.data?.role || null;
  } catch (error) {
    return null;
  }
}

export async function getPendingInvitations(projectId: string): Promise<Invitation[]> {
  try {
    const result = await db.from('project_invitations')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .execute();

    return result.data || [];
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
}

export const listInvitations = getPendingInvitations;
export const inviteUser = inviteCollaborator;

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  try {
    await db.from('project_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return false;
  }
}
