import { useState, useEffect, useCallback, useRef } from 'react';
import { collaboration, type UserPresence, type Activity, type Collaborator } from '@/lib/collaboration';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useCollaboration(projectId: string | null, enabled: boolean = true) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const activityChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout>();

  const loadCollaborators = useCallback(async () => {
    if (!projectId) return;

    const result = await collaboration.listCollaborators(projectId);
    if (result.success && result.collaborators) {
      setCollaborators(result.collaborators);
    }
  }, [projectId]);

  const loadActivity = useCallback(async () => {
    if (!projectId) return;

    const result = await collaboration.getActivity(projectId, 20);
    if (result.success && result.activities) {
      setRecentActivity(result.activities);
    }
  }, [projectId]);

  const loadActiveUsers = useCallback(async () => {
    if (!projectId) return;

    const result = await collaboration.getActiveUsers(projectId);
    if (result.success && result.users) {
      setActiveUsers(result.users);
    }
  }, [projectId]);

  const updatePresence = useCallback(
    async (cursorX: number, cursorY: number, selectedNodeId?: string) => {
      if (!projectId || !enabled) return;

      const result = await collaboration.updatePresence(
        projectId,
        cursorX,
        cursorY,
        selectedNodeId
      );

      if (!result.success) {
        console.error('Failed to update presence:', result.error);
      }
    },
    [projectId, enabled]
  );

  const removePresence = useCallback(async () => {
    if (!projectId) return;

    await collaboration.removePresence(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !enabled) return;

    setIsLoading(true);

    Promise.all([loadCollaborators(), loadActivity(), loadActiveUsers()])
      .catch((err) => {
        console.error('Error loading collaboration data:', err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });

    presenceChannelRef.current = collaboration.subscribeToPresence(
      projectId,
      (presences) => {
        setActiveUsers(presences);
      }
    );

    activityChannelRef.current = collaboration.subscribeToActivity(
      projectId,
      (activity) => {
        setRecentActivity((prev) => [activity, ...prev].slice(0, 20));
      }
    );

    presenceIntervalRef.current = setInterval(() => {
      loadActiveUsers();
    }, 30000);

    return () => {
      if (presenceChannelRef.current) {
        collaboration.unsubscribe(presenceChannelRef.current);
      }
      if (activityChannelRef.current) {
        collaboration.unsubscribe(activityChannelRef.current);
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      removePresence();
    };
  }, [projectId, enabled, loadCollaborators, loadActivity, loadActiveUsers, removePresence]);

  return {
    activeUsers,
    collaborators,
    recentActivity,
    isLoading,
    error,
    updatePresence,
    removePresence,
    refreshCollaborators: loadCollaborators,
    refreshActivity: loadActivity,
  };
}

export function usePresenceTracking(
  projectId: string | null,
  enabled: boolean = true,
  throttleMs: number = 100
) {
  const lastUpdateRef = useRef<number>(0);
  const { updatePresence } = useCollaboration(projectId, false);

  const trackCursor = useCallback(
    (cursorX: number, cursorY: number, selectedNodeId?: string) => {
      if (!enabled || !projectId) return;

      const now = Date.now();
      if (now - lastUpdateRef.current < throttleMs) return;

      lastUpdateRef.current = now;
      updatePresence(cursorX, cursorY, selectedNodeId);
    },
    [enabled, projectId, throttleMs, updatePresence]
  );

  return { trackCursor };
}
