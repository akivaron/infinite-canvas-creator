import { fetchWithRetry } from './fetchWithRetry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

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
  details?: any;
  created_at: string;
}

/** Load collaborators, activity, and active users (single API call). */
export async function getCollaborationInitialData(projectId: string): Promise<{
  collaborators: Collaborator[];
  activity: Activity[];
  activeUsers: UserPresence[];
}> {
  try {
    const res = await fetchWithRetry(
      `${API_URL}/collaboration/initial?projectId=${encodeURIComponent(projectId)}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load collaboration data');
    }
    const data = await res.json();
    return {
      collaborators: data.collaborators ?? [],
      activity: (data.activity ?? []).map((a: Activity) => ({ ...a, metadata: a.metadata ?? a.details })),
      activeUsers: data.activeUsers ?? [],
    };
  } catch (error) {
    console.error('Error fetching collaboration initial data:', error);
    return { collaborators: [], activity: [], activeUsers: [] };
  }
}

// Dedupe: only one in-flight refresh request per projectId (fixes 2x hit from Strict Mode / double call)
let refreshPromise: Promise<{ activity: Activity[]; activeUsers: UserPresence[] }> | null = null;
let refreshProjectId: string | null = null;

/** Refresh activity and active users (single API call). Deduped so concurrent calls = 1 request. */
export async function getCollaborationRefreshData(projectId: string): Promise<{
  activity: Activity[];
  activeUsers: UserPresence[];
}> {
  if (refreshPromise && refreshProjectId === projectId) {
    return refreshPromise;
  }
  refreshProjectId = projectId;
  refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${API_URL}/collaboration/refresh?projectId=${encodeURIComponent(projectId)}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to refresh');
      }
      const data = await res.json();
      return {
        activity: (data.activity ?? []).map((a: Activity) => ({ ...a, metadata: a.metadata ?? a.details })),
        activeUsers: data.activeUsers ?? [],
      };
    } catch (error) {
      console.error('Error fetching collaboration refresh data:', error);
      return { activity: [], activeUsers: [] };
    } finally {
      refreshPromise = null;
      refreshProjectId = null;
    }
  })();
  return refreshPromise;
}

export async function getProjectCollaborators(projectId: string): Promise<Collaborator[]> {
  try {
    const res = await fetchWithRetry(
      `${API_URL}/collaboration/collaborators?projectId=${encodeURIComponent(projectId)}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
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
    const res = await fetchWithRetry(`${API_URL}/collaboration/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, email, role, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to invite');
    }
    const data = await res.json();
    return data.data ?? null;
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    return null;
  }
}

export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  try {
    const res = await fetchWithRetry(`${API_URL}/collaboration/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to accept');
    }
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
    const res = await fetchWithRetry(`${API_URL}/collaboration/remove`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, collaboratorId, userId }),
    });
    if (!res.ok) return false;
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
    const res = await fetchWithRetry(`${API_URL}/collaboration/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ collaboratorId, newRole }),
    });
    if (!res.ok) return false;
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
    await fetchWithRetry(`${API_URL}/collaboration/presence`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, userId, ...presence }),
    });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

export async function getActiveUsers(projectId: string): Promise<UserPresence[]> {
  try {
    const { activeUsers } = await getCollaborationRefreshData(projectId);
    return activeUsers;
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
    await fetchWithRetry(`${API_URL}/collaboration/log-activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        projectId,
        userId,
        actionType,
        entityType,
        entityId,
        metadata,
      }),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

const ACTIVITY_LIMIT = 20;

export async function getProjectActivity(
  projectId: string,
  limit: number = ACTIVITY_LIMIT
): Promise<Activity[]> {
  try {
    const res = await fetchWithRetry(
      `${API_URL}/collaboration/activity?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to load activity');
    const data = await res.json();
    return (data.data ?? []).map((a: Activity) => ({ ...a, metadata: a.metadata ?? a.details }));
  } catch (error) {
    console.error('Error fetching activity:', error);
    throw error;
  }
}

export async function checkUserPermission(
  projectId: string,
  userId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  try {
    const res = await fetchWithRetry(
      `${API_URL}/collaboration/permission?projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch (error) {
    return null;
  }
}

export async function getPendingInvitations(projectId: string): Promise<Invitation[]> {
  try {
    const res = await fetchWithRetry(
      `${API_URL}/collaboration/invitations?projectId=${encodeURIComponent(projectId)}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
}

export const listInvitations = getPendingInvitations;
export const inviteUser = inviteCollaborator;

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  try {
    const res = await fetchWithRetry(`${API_URL}/collaboration/revoke-invitation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ invitationId }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return false;
  }
}
