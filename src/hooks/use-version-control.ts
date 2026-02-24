import { useState, useCallback } from 'react';
import { versionControl, type ProjectVersion } from '@/lib/versionControl';
import type { CanvasNode } from '@/stores/canvasStore';

export function useVersionControl(projectId: string | null) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    const result = await versionControl.listVersions(projectId);

    if (result.success && result.versions) {
      setVersions(result.versions);
    } else {
      setError(result.error || 'Failed to load versions');
    }

    setIsLoading(false);
  }, [projectId]);

  const createVersion = useCallback(
    async (nodes: CanvasNode[], changesSummary: string, tag?: string) => {
      if (!projectId) return { success: false, error: 'No project ID' };

      setIsLoading(true);
      setError(null);

      const result = await versionControl.createVersion(
        projectId,
        nodes,
        changesSummary,
        tag
      );

      if (result.success) {
        await loadVersions();
      } else {
        setError(result.error || 'Failed to create version');
      }

      setIsLoading(false);
      return result;
    },
    [projectId, loadVersions]
  );

  const restoreVersion = useCallback(
    async (versionId: string) => {
      if (!projectId) return { success: false, error: 'No project ID' };

      setIsLoading(true);
      setError(null);

      const result = await versionControl.restoreVersion(projectId, versionId);

      if (!result.success) {
        setError(result.error || 'Failed to restore version');
      }

      setIsLoading(false);
      return result;
    },
    [projectId]
  );

  const tagVersion = useCallback(
    async (versionId: string, tag: string) => {
      setIsLoading(true);
      setError(null);

      const result = await versionControl.tagVersion(versionId, tag);

      if (result.success) {
        await loadVersions();
      } else {
        setError(result.error || 'Failed to tag version');
      }

      setIsLoading(false);
      return result;
    },
    [loadVersions]
  );

  const compareVersions = useCallback(async (version1Id: string, version2Id: string) => {
    setIsLoading(true);
    setError(null);

    const result = await versionControl.compareVersions(version1Id, version2Id);

    if (!result.success) {
      setError(result.error || 'Failed to compare versions');
    }

    setIsLoading(false);
    return result;
  }, []);

  const autoCreateVersion = useCallback(
    async (nodes: CanvasNode[], threshold: number = 5) => {
      if (!projectId) return { success: false, created: false };

      const result = await versionControl.autoCreateVersion(projectId, nodes, threshold);

      if (result.created) {
        await loadVersions();
      }

      return result;
    },
    [projectId, loadVersions]
  );

  return {
    versions,
    isLoading,
    error,
    loadVersions,
    createVersion,
    restoreVersion,
    tagVersion,
    compareVersions,
    autoCreateVersion,
  };
}
