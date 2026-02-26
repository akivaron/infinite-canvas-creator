import { createContext, useContext, type ReactNode } from 'react';
import { useCollaboration } from '@/hooks/use-collaboration';
import type { UserPresence, Activity, Collaborator } from '@/lib/collaboration';

export interface CollaborationContextValue {
  activeUsers: UserPresence[];
  collaborators: Collaborator[];
  recentActivity: Activity[];
  isLoading: boolean;
  error: string | null;
  updatePresence: (cursorX: number, cursorY: number, selectedNodeId?: string, userId?: string) => Promise<void>;
  refreshCollaborators: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshActiveUsers: () => Promise<void>;
}

const defaultValue: CollaborationContextValue = {
  activeUsers: [],
  collaborators: [],
  recentActivity: [],
  isLoading: false,
  error: null,
  updatePresence: async () => {},
  refreshCollaborators: async () => {},
  refreshActivity: async () => {},
  refreshActiveUsers: async () => {},
};

const CollaborationContext = createContext<CollaborationContextValue>(defaultValue);

export function CollaborationProvider({
  projectId,
  enabled = true,
  children,
}: {
  projectId: string | null;
  enabled?: boolean;
  children: ReactNode;
}) {
  const value = useCollaboration(projectId, enabled);
  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaborationContext(): CollaborationContextValue {
  return useContext(CollaborationContext);
}
