import type { CanvasNode } from '@/stores/canvasStore';
import { apiClient } from './api';
import { logActivity } from './collaboration';

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  snapshot: {
    nodes_data: CanvasNode[];
    name: string;
    metadata?: Record<string, any>;
  };
  changes_summary: string;
  tag?: string;
  created_by: string;
  created_at: string;
}

export interface VersionDiff {
  added: CanvasNode[];
  removed: CanvasNode[];
  modified: {
    nodeId: string;
    changes: Partial<CanvasNode>;
  }[];
}

export const versionControl = {
  async createVersion(
    projectId: string,
    nodes: CanvasNode[],
    changesSummary: string,
    tag?: string
  ): Promise<{ success: boolean; version?: ProjectVersion; error?: string }> {
    try {
      const { data: nextVersionData, error: versionError } = await supabase
        .rpc('get_next_version_number', { p_project_id: projectId });

      if (versionError) throw versionError;

      const versionNumber = nextVersionData || 1;

      const user = await apiClient.getMe();
      const userId = user?.id ?? null;

      const { data, error } = await supabase
        .from('project_versions')
        .insert({
          project_id: projectId,
          version_number: versionNumber,
          snapshot: {
            nodes_data: nodes,
            name: 'Version ' + versionNumber,
          },
          changes_summary: changesSummary,
          tag,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logActivity(projectId, userId ?? '', 'version_created', 'version', data.id, {
        version_number: versionNumber,
        changes_summary: changesSummary,
        tag,
      });

      return { success: true, version: data };
    } catch (error) {
      console.error('Error creating version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version',
      };
    }
  },

  async listVersions(
    projectId: string,
    limit: number = 50
  ): Promise<{ success: boolean; versions?: ProjectVersion[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, versions: data || [] };
    } catch (error) {
      console.error('Error listing versions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list versions',
      };
    }
  },

  async getVersion(
    versionId: string
  ): Promise<{ success: boolean; version?: ProjectVersion; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) throw error;

      return { success: true, version: data };
    } catch (error) {
      console.error('Error getting version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version',
      };
    }
  },

  async restoreVersion(
    projectId: string,
    versionId: string
  ): Promise<{ success: boolean; nodes?: CanvasNode[]; error?: string }> {
    try {
      const versionResult = await this.getVersion(versionId);
      if (!versionResult.success || !versionResult.version) {
        throw new Error(versionResult.error || 'Version not found');
      }

      const nodes = versionResult.version.snapshot.nodes_data;

      const { error: updateError } = await supabase
        .from('canvas_projects')
        .update({
          nodes_data: nodes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      const user = await apiClient.getMe();
      await logActivity(projectId, user?.id ?? '', 'version_restored', 'version', versionId, {
        version_number: versionResult.version.version_number,
      });

      return { success: true, nodes };
    } catch (error) {
      console.error('Error restoring version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore version',
      };
    }
  },

  async tagVersion(
    versionId: string,
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_versions')
        .update({ tag })
        .eq('id', versionId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error tagging version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to tag version',
      };
    }
  },

  async compareVersions(
    version1Id: string,
    version2Id: string
  ): Promise<{ success: boolean; diff?: VersionDiff; error?: string }> {
    try {
      const [v1Result, v2Result] = await Promise.all([
        this.getVersion(version1Id),
        this.getVersion(version2Id),
      ]);

      if (!v1Result.success || !v2Result.success) {
        throw new Error('Failed to fetch versions');
      }

      const v1Nodes = v1Result.version!.snapshot.nodes_data;
      const v2Nodes = v2Result.version!.snapshot.nodes_data;

      const v1Map = new Map(v1Nodes.map((n) => [n.id, n]));
      const v2Map = new Map(v2Nodes.map((n) => [n.id, n]));

      const added = v2Nodes.filter((n) => !v1Map.has(n.id));
      const removed = v1Nodes.filter((n) => !v2Map.has(n.id));
      const modified: VersionDiff['modified'] = [];

      for (const node of v2Nodes) {
        const oldNode = v1Map.get(node.id);
        if (oldNode) {
          const changes: Partial<CanvasNode> = {};
          let hasChanges = false;

          (Object.keys(node) as Array<keyof CanvasNode>).forEach((key) => {
            if (JSON.stringify(node[key]) !== JSON.stringify(oldNode[key])) {
              changes[key] = node[key] as any;
              hasChanges = true;
            }
          });

          if (hasChanges) {
            modified.push({ nodeId: node.id, changes });
          }
        }
      }

      return {
        success: true,
        diff: { added, removed, modified },
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare versions',
      };
    }
  },

  async autoCreateVersion(
    projectId: string,
    nodes: CanvasNode[],
    threshold: number = 5
  ): Promise<{ success: boolean; created: boolean; error?: string }> {
    try {
      const { data: versions, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!versions || versions.length === 0) {
        const result = await this.createVersion(
          projectId,
          nodes,
          'Initial auto-saved version'
        );
        return { success: result.success, created: result.success };
      }

      const lastVersion = versions[0];
      const lastNodes = lastVersion.snapshot.nodes_data;

      const added = nodes.filter(
        (n) => !lastNodes.find((ln: CanvasNode) => ln.id === n.id)
      );
      const removed = lastNodes.filter(
        (ln: CanvasNode) => !nodes.find((n) => n.id === ln.id)
      );
      const modified = nodes.filter((n) => {
        const oldNode = lastNodes.find((ln: CanvasNode) => ln.id === n.id);
        return oldNode && JSON.stringify(n) !== JSON.stringify(oldNode);
      });

      const changeCount = added.length + removed.length + modified.length;

      if (changeCount >= threshold) {
        const summary = `Auto-saved: ${added.length} added, ${removed.length} removed, ${modified.length} modified`;
        const result = await this.createVersion(projectId, nodes, summary);
        return { success: result.success, created: result.success };
      }

      return { success: true, created: false };
    } catch (error) {
      console.error('Error auto-creating version:', error);
      return {
        success: false,
        created: false,
        error: error instanceof Error ? error.message : 'Failed to auto-create version',
      };
    }
  },
};
