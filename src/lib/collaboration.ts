import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}

export const collaboration = {
  async inviteUser(
    projectId: string,
    email: string,
    role: 'editor' | 'viewer'
  ): Promise<{ success: boolean; invitation?: Invitation; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          email,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('project_activity').insert({
        project_id: projectId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'invited',
        entity_type: 'user',
        details: { email, role },
      });

      return { success: true, invitation: data };
    } catch (error) {
      console.error('Error inviting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite user',
      };
    }
  },

  async acceptInvitation(
    token: string
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token,
      });

      if (error) throw error;

      if (data?.success) {
        return { success: true, projectId: data.project_id };
      }

      return { success: false, error: data?.error || 'Failed to accept invitation' };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      };
    }
  },

  async revokeInvitation(
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke invitation',
      };
    }
  },

  async listInvitations(
    projectId: string
  ): Promise<{ success: boolean; invitations?: Invitation[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, invitations: data || [] };
    } catch (error) {
      console.error('Error listing invitations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list invitations',
      };
    }
  },

  async listCollaborators(
    projectId: string
  ): Promise<{ success: boolean; collaborators?: Collaborator[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'accepted')
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return { success: true, collaborators: data || [] };
    } catch (error) {
      console.error('Error listing collaborators:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list collaborators',
      };
    }
  },

  async removeCollaborator(
    collaboratorId: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      await supabase.from('project_activity').insert({
        project_id: projectId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'removed',
        entity_type: 'collaborator',
        entity_id: collaboratorId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove collaborator',
      };
    }
  },

  async updateCollaboratorRole(
    collaboratorId: string,
    role: 'owner' | 'editor' | 'viewer'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ role })
        .eq('id', collaboratorId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      };
    }
  },

  async updatePresence(
    projectId: string,
    cursorX: number,
    cursorY: number,
    selectedNodeId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_presence').upsert(
        {
          project_id: projectId,
          user_id: user.id,
          user_email: user.email,
          cursor_x: cursorX,
          cursor_y: cursorY,
          selected_node_id: selectedNodeId || null,
          color: getUserColor(user.id),
          last_active: new Date().toISOString(),
        },
        { onConflict: 'project_id,user_id' }
      );

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating presence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update presence',
      };
    }
  },

  async removePresence(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_presence')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing presence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove presence',
      };
    }
  },

  async getActiveUsers(
    projectId: string
  ): Promise<{ success: boolean; users?: UserPresence[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('project_id', projectId)
        .gte('last_active', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) throw error;

      return { success: true, users: data || [] };
    } catch (error) {
      console.error('Error getting active users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active users',
      };
    }
  },

  async getActivity(
    projectId: string,
    limit: number = 50
  ): Promise<{ success: boolean; activities?: Activity[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, activities: data || [] };
    } catch (error) {
      console.error('Error getting activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get activity',
      };
    }
  },

  async logActivity(
    projectId: string,
    actionType: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('project_activity').insert({
        project_id: projectId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || {},
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log activity',
      };
    }
  },

  subscribeToPresence(
    projectId: string,
    onPresenceChange: (presences: UserPresence[]) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`presence:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `project_id=eq.${projectId}`,
        },
        async () => {
          const result = await collaboration.getActiveUsers(projectId);
          if (result.success && result.users) {
            onPresenceChange(result.users);
          }
        }
      )
      .subscribe();

    return channel;
  },

  subscribeToActivity(
    projectId: string,
    onActivityChange: (activity: Activity) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`activity:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onActivityChange(payload.new as Activity);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel);
  },
};
