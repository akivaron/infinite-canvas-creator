import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { db } from '@/lib/db';

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

  const saveToSupabase = useCallback(async () => {
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

      const { data: existingProject } = await db
        .from('canvas_projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();

      if (existingProject) {
        const { error: updateError } = await db
          .from('canvas_projects')
          .update({
            nodes_data: nodes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId)
          .execute();

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await db
          .from('canvas_projects')
          .insert({
            id: projectId,
            name: 'Untitled Project',
            nodes_data: nodes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();

        if (insertError) throw insertError;
      }

      for (const node of nodes) {
        const { data: existingNode } = await db
          .from('canvas_nodes')
          .select('id')
          .eq('id', node.id)
          .maybeSingle();

        const nodeData = {
          id: node.id,
          project_id: projectId,
          type: node.type,
          title: node.title,
          description: node.description,
          content: node.content || null,
          position_x: node.x,
          position_y: node.y,
          width: node.width,
          height: node.height,
          status: node.status,
          metadata: {
            fileName: node.fileName,
            generatedCode: node.generatedCode,
            connectedTo: node.connectedTo,
            picked: node.picked,
            parentId: node.parentId,
            pageRole: node.pageRole,
            tag: node.tag,
            platform: node.platform,
            elementLinks: node.elementLinks,
            language: node.language,
            envVars: node.envVars,
            aiModel: node.aiModel,
            generatedFiles: node.generatedFiles,
            isLocked: node.isLocked,
            isCollapsed: node.isCollapsed,
          },
          updated_at: new Date().toISOString(),
        };

        if (existingNode) {
          const { error: nodeError } = await db
            .from('canvas_nodes')
            .update(nodeData)
            .eq('id', node.id)
            .execute();

          if (nodeError) {
            console.error('Error updating node:', node.id, nodeError);
          }
        } else {
          const { error: nodeError } = await db
            .from('canvas_nodes')
            .insert(nodeData)
            .execute();

          if (nodeError) {
            console.error('Error inserting node:', node.id, nodeError);
          }
        }
      }

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
      saveToSupabase();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, projectId, enabled, debounceMs, saveToSupabase]);

  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToSupabase();
  }, [saveToSupabase]);

  const loadFromSupabase = useCallback(async (loadProjectId?: string) => {
    const targetProjectId = loadProjectId || projectId;

    if (!targetProjectId) {
      return { success: false, error: 'No project ID provided' };
    }

    try {
      setSaveStatus('saving');

      const { data: project, error: projectError} = await db
        .from('canvas_projects')
        .select('nodes_data')
        .eq('id', targetProjectId)
        .maybeSingle();

      if (projectError) throw projectError;

      if (project?.nodes_data) {
        const loadedNodes = Array.isArray(project.nodes_data)
          ? project.nodes_data
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
    loadFromSupabase,
  };
}
