import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  onSave?: (success: boolean, error?: Error) => void;
}

export function useAutosave(options: AutosaveOptions = {}) {
  const {
    enabled = true,
    debounceMs = 2000,
    onSave,
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const projectId = useCanvasStore((state) => state.projectId);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const previousNodesRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const saveToLocalStorage = useCallback(async () => {
    if (!enabled || !projectId || isSavingRef.current) {
      return;
    }

    const nodesJson = JSON.stringify(nodes);

    if (nodesJson === previousNodesRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');
      setError(null);

      const projectData = {
        id: projectId,
        name: 'Untitled Project',
        nodes: nodes,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));

      previousNodesRef.current = nodesJson;
      setSaveStatus('saved');
      setLastSaved(new Date());
      setError(null);

      onSave?.(true);

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Autosave error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setSaveStatus('error');
      onSave?.(false, err instanceof Error ? err : new Error(errorMessage));

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      isSavingRef.current = false;
    }
  }, [nodes, projectId, enabled, onSave]);

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, projectId, enabled, debounceMs, saveToLocalStorage]);

  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToLocalStorage();
  }, [saveToLocalStorage]);

  const loadFromLocalStorage = useCallback(async (loadProjectId?: string) => {
    const targetProjectId = loadProjectId || projectId;

    if (!targetProjectId) {
      return { success: false, error: 'No project ID provided' };
    }

    try {
      setSaveStatus('saving');

      const projectDataStr = localStorage.getItem(`project_${targetProjectId}`);

      if (projectDataStr) {
        const projectData = JSON.parse(projectDataStr);
        const loadedNodes = Array.isArray(projectData.nodes)
          ? projectData.nodes
          : [];

        useCanvasStore.setState({ nodes: loadedNodes });
        previousNodesRef.current = JSON.stringify(loadedNodes);

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);

        return { success: true, nodes: loadedNodes };
      }

      return { success: false, error: 'Project not found' };
    } catch (err) {
      console.error('Load error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load';
      setError(errorMessage);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);

      return { success: false, error: errorMessage };
    }
  }, [projectId]);

  return {
    saveStatus,
    lastSaved,
    error,
    forceSave,
    loadFromLocalStorage,
  };
}
