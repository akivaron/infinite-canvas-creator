import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ragService } from '../services/ragService.js';

const router = Router();

const getSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { isPublic, userId, tags, search, limit = 20, offset = 0 } = req.query;
    const supabase = getSupabase();

    let query = supabase
      .from('canvas_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    }

    if (userId) {
      query = query.eq('user_id', String(userId));
    }

    if (tags && typeof tags === 'string') {
      const tagArray = tags.split(',');
      query = query.contains('tags', tagArray);
    }

    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ projects: data || [] });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();

    const [projectResult, nodesResult, connectionsResult] = await Promise.all([
      supabase.from('canvas_projects').select('*').eq('id', projectId).single(),
      supabase.from('canvas_nodes').select('*').eq('project_id', projectId),
      supabase.from('canvas_connections').select('*').eq('project_id', projectId),
    ]);

    if (projectResult.error) throw projectResult.error;

    await supabase
      .from('canvas_projects')
      .update({ view_count: (projectResult.data.view_count || 0) + 1 })
      .eq('id', projectId);

    res.json({
      project: projectResult.data,
      nodes: nodesResult.data || [],
      connections: connectionsResult.data || [],
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, thumbnail, tags, isPublic, metadata, userId } = req.body;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('canvas_projects')
      .insert({
        user_id: userId,
        name: name || 'Untitled Project',
        description: description || '',
        thumbnail,
        tags: tags || [],
        is_public: isPublic || false,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description, thumbnail, tags, isPublic, metadata } = req.body;
    const supabase = getSupabase();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.is_public = isPublic;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data, error } = await supabase
      .from('canvas_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();

    await ragService.deleteProjectEmbeddings(projectId);

    const { error } = await supabase
      .from('canvas_projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/nodes', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { nodeId, nodeType, position, size, data, metadata } = req.body;
    const supabase = getSupabase();

    const { data: nodeData, error } = await supabase
      .from('canvas_nodes')
      .insert({
        project_id: projectId,
        node_id: nodeId,
        node_type: nodeType,
        position_x: position?.x || 0,
        position_y: position?.y || 0,
        width: size?.width || 200,
        height: size?.height || 100,
        data: data || {},
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    await ragService.indexCanvasNode(projectId, nodeId, nodeType, data);

    res.json({ node: nodeData });
  } catch (error) {
    console.error('Create node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/:projectId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId } = req.params;
    const { nodeType, position, size, data, metadata } = req.body;
    const supabase = getSupabase();

    const updateData: any = {};
    if (nodeType !== undefined) updateData.node_type = nodeType;
    if (position?.x !== undefined) updateData.position_x = position.x;
    if (position?.y !== undefined) updateData.position_y = position.y;
    if (size?.width !== undefined) updateData.width = size.width;
    if (size?.height !== undefined) updateData.height = size.height;
    if (data !== undefined) updateData.data = data;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: nodeData, error } = await supabase
      .from('canvas_nodes')
      .update(updateData)
      .eq('project_id', projectId)
      .eq('node_id', nodeId)
      .select()
      .single();

    if (error) throw error;

    if (data !== undefined) {
      await ragService.indexCanvasNode(projectId, nodeId, nodeType || nodeData.node_type, data);
    }

    res.json({ node: nodeData });
  } catch (error) {
    console.error('Update node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId } = req.params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('canvas_nodes')
      .delete()
      .eq('project_id', projectId)
      .eq('node_id', nodeId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/nodes/batch', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { nodes } = req.body;
    const supabase = getSupabase();

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'nodes must be an array' });
    }

    const nodesToInsert = nodes.map(node => ({
      project_id: projectId,
      node_id: node.nodeId,
      node_type: node.nodeType,
      position_x: node.position?.x || 0,
      position_y: node.position?.y || 0,
      width: node.size?.width || 200,
      height: node.size?.height || 100,
      data: node.data || {},
      metadata: node.metadata || {},
    }));

    const { data, error } = await supabase
      .from('canvas_nodes')
      .upsert(nodesToInsert, {
        onConflict: 'project_id,node_id',
      })
      .select();

    if (error) throw error;

    for (const node of nodes) {
      if (node.data) {
        await ragService.indexCanvasNode(
          projectId,
          node.nodeId,
          node.nodeType,
          node.data
        ).catch(console.error);
      }
    }

    res.json({ nodes: data });
  } catch (error) {
    console.error('Batch nodes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/connections', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sourceNodeId, targetNodeId, connectionType, metadata } = req.body;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('canvas_connections')
      .insert({
        project_id: projectId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        connection_type: connectionType || 'data',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ connection: data });
  } catch (error) {
    console.error('Create connection error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId/connections/:connectionId', async (req: Request, res: Response) => {
  try {
    const { projectId, connectionId } = req.params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('canvas_connections')
      .delete()
      .eq('id', connectionId)
      .eq('project_id', projectId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:projectId/versions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    res.json({ versions: data || [] });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/versions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { changes, userId } = req.body;
    const supabase = getSupabase();

    const [projectResult, nodesResult, connectionsResult] = await Promise.all([
      supabase.from('canvas_projects').select('*').eq('id', projectId).single(),
      supabase.from('canvas_nodes').select('*').eq('project_id', projectId),
      supabase.from('canvas_connections').select('*').eq('project_id', projectId),
    ]);

    if (projectResult.error) throw projectResult.error;

    const versionsResult = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (versionsResult.data?.version_number || 0) + 1;

    const snapshot = {
      project: projectResult.data,
      nodes: nodesResult.data || [],
      connections: connectionsResult.data || [],
    };

    const { data, error } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectId,
        version_number: nextVersion,
        snapshot,
        changes: changes || 'Manual save',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ version: data });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/restore/:versionNumber', async (req: Request, res: Response) => {
  try {
    const { projectId, versionNumber } = req.params;
    const supabase = getSupabase();

    const { data: version, error: versionError } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('version_number', Number(versionNumber))
      .single();

    if (versionError) throw versionError;

    const snapshot: any = version.snapshot;

    await supabase.from('canvas_nodes').delete().eq('project_id', projectId);
    await supabase.from('canvas_connections').delete().eq('project_id', projectId);

    if (snapshot.nodes && Array.isArray(snapshot.nodes)) {
      await supabase.from('canvas_nodes').insert(
        snapshot.nodes.map((n: any) => ({
          ...n,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        }))
      );
    }

    if (snapshot.connections && Array.isArray(snapshot.connections)) {
      await supabase.from('canvas_connections').insert(
        snapshot.connections.map((c: any) => ({
          ...c,
          id: undefined,
          created_at: undefined,
        }))
      );
    }

    if (snapshot.project) {
      await supabase
        .from('canvas_projects')
        .update({
          name: snapshot.project.name,
          description: snapshot.project.description,
          metadata: snapshot.project.metadata,
        })
        .eq('id', projectId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/star', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('project_stars')
      .insert({
        project_id: projectId,
        user_id: userId,
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Star project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId/star/:userId', async (req: Request, res: Response) => {
  try {
    const { projectId, userId } = req.params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('project_stars')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Unstar project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:projectId/export', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { format = 'json' } = req.query;
    const supabase = getSupabase();

    const [projectResult, nodesResult, connectionsResult] = await Promise.all([
      supabase.from('canvas_projects').select('*').eq('id', projectId).single(),
      supabase.from('canvas_nodes').select('*').eq('project_id', projectId),
      supabase.from('canvas_connections').select('*').eq('project_id', projectId),
    ]);

    if (projectResult.error) throw projectResult.error;

    const exportData = {
      version: '1.0',
      project: projectResult.data,
      nodes: nodesResult.data || [],
      connections: connectionsResult.data || [],
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${projectResult.data.name || 'project'}.json"`
      );
      res.json(exportData);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  try {
    const { projectData, userId } = req.body;
    const supabase = getSupabase();

    if (!projectData || !projectData.project) {
      return res.status(400).json({ error: 'Invalid project data' });
    }

    const { data: newProject, error: projectError } = await supabase
      .from('canvas_projects')
      .insert({
        user_id: userId,
        name: `${projectData.project.name} (Imported)`,
        description: projectData.project.description,
        tags: projectData.project.tags,
        metadata: projectData.project.metadata,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    if (projectData.nodes && Array.isArray(projectData.nodes)) {
      const nodesToInsert = projectData.nodes.map((node: any) => ({
        project_id: newProject.id,
        node_id: node.node_id,
        node_type: node.node_type,
        position_x: node.position_x,
        position_y: node.position_y,
        width: node.width,
        height: node.height,
        data: node.data,
        metadata: node.metadata,
      }));

      await supabase.from('canvas_nodes').insert(nodesToInsert);
    }

    if (projectData.connections && Array.isArray(projectData.connections)) {
      const connectionsToInsert = projectData.connections.map((conn: any) => ({
        project_id: newProject.id,
        source_node_id: conn.source_node_id,
        target_node_id: conn.target_node_id,
        connection_type: conn.connection_type,
        metadata: conn.metadata,
      }));

      await supabase.from('canvas_connections').insert(connectionsToInsert);
    }

    res.json({ project: newProject });
  } catch (error) {
    console.error('Import project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
