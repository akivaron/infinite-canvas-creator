import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProjectCollaborators,
  getActiveUsers,
  getProjectActivity,
  updateUserPresence,
  type UserPresence,
  type Activity,
  type Collaborator
} from '@/lib/collaboration';

export function useCollaboration(projectId: string | null, enabled: boolean = true) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presenceIntervalRef = useRef<NodeJS.Timeout>();

  const loadCollaborators = useCallback(async () => {
    if (!projectId) return;

    try {
      const collaboratorsList = await getProjectCollaborators(projectId);
      setCollaborators(collaboratorsList);
    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collaborators');
    }
  }, [projectId]);

  const loadActivity = useCallback(async () => {
    if (!projectId) return;

    try {
      const activities = await getProjectActivity(projectId, 20);
      setRecentActivity(activities);
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }, [projectId]);

  const loadActiveUsers = useCallback(async () => {
    if (!projectId) return;

    try {
      const users = await getActiveUsers(projectId);
      setActiveUsers(users);
    } catch (err) {
      console.error('Error loading active users:', err);
    }
  }, [projectId]);

  const updatePresence = useCallback(
    async (cursorX: number, cursorY: number, selectedNodeId?: string, userId?: string) => {
      if (!projectId || !enabled || !userId) return;

      try {
        await updateUserPresence(projectId, userId, {
          cursor_x: cursorX,
          cursor_y: cursorY,
          selected_node_id: selectedNodeId
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    },
    [projectId, enabled]
  );

  useEffect(() => {
    if (!projectId || !enabled) return;

    setIsLoading(true);

    Promise.all([
      loadCollaborators(),
      loadActivity(),
      loadActiveUsers()
    ]).finally(() => {
      setIsLoading(false);
    });

    presenceIntervalRef.current = setInterval(() => {
      loadActiveUsers();
      loadActivity();
    }, 5000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [projectId, enabled, loadCollaborators, loadActivity, loadActiveUsers]);

  return {
    activeUsers,
    collaborators,
    recentActivity,
    isLoading,
    error,
    updatePresence,
    refreshCollaborators: loadCollaborators,
    refreshActivity: loadActivity,
    refreshActiveUsers: loadActiveUsers
  };
}

export const usePresenceTracking = useCollaboration;
