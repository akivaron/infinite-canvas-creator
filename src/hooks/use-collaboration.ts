import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCollaborationInitialData,
  getCollaborationRefreshData,
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
  const consecutiveFailuresRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const MAX_API_FAILURES = 2;

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

    consecutiveFailuresRef.current = 0;
    setIsLoading(true);

    getCollaborationInitialData(projectId)
      .then(({ collaborators, activity, activeUsers }) => {
        setCollaborators(collaborators);
        setRecentActivity(activity);
        setActiveUsers(activeUsers);
      })
      .catch((err) => {
        console.error('Error loading collaboration data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load collaboration data');
      })
      .finally(() => {
        setIsLoading(false);
      });

    presenceIntervalRef.current = setInterval(async () => {
      if (consecutiveFailuresRef.current >= MAX_API_FAILURES) {
        if (presenceIntervalRef.current) {
          clearInterval(presenceIntervalRef.current);
          presenceIntervalRef.current = undefined;
        }
        return;
      }
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        const { activity, activeUsers } = await getCollaborationRefreshData(projectId);
        setRecentActivity(activity);
        setActiveUsers(activeUsers);
        consecutiveFailuresRef.current = 0;
      } catch {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= MAX_API_FAILURES && presenceIntervalRef.current) {
          clearInterval(presenceIntervalRef.current);
          presenceIntervalRef.current = undefined;
        }
      } finally {
        refreshInFlightRef.current = false;
      }
    }, 5000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [projectId, enabled]);

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
