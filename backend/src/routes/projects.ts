import { Router, Request, Response } from 'express';
import { projectService } from '../services/projectService.js';
import { nodeService } from '../services/nodeService.js';
import { connectionService } from '../services/connectionService.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { isPublic, userId, tags, search, limit = 20, offset = 0 } = req.query;

    const projects = await projectService.listProjects({
      isPublic: isPublic === 'true' ? true : undefined,
      userId: userId as string,
      tags: tags ? String(tags).split(',') : undefined,
      search: search as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({ projects });
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

    const { project, nodes, connections } = await projectService.getProjectWithDetails(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await projectService.incrementViewCount(projectId);

    res.json({ project, nodes, connections });
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

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const project = await projectService.createProject({
      userId,
      name,
      description,
      thumbnail,
      tags,
      isPublic,
      metadata
    });

    res.status(201).json({ project });
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

    const project = await projectService.updateProject(projectId, {
      name,
      description,
      thumbnail,
      tags,
      isPublic,
      metadata
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
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

    await projectService.deleteProject(projectId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/duplicate', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const newProject = await projectService.duplicateProject(projectId, userId);

    res.status(201).json({ project: newProject });
  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:projectId/nodes', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const nodes = await nodeService.getNodesByProject(projectId);
    res.json({ nodes });
  } catch (error) {
    console.error('Get nodes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/nodes', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { type, positionX, positionY, data } = req.body;

    const node = await nodeService.createNode({
      projectId,
      type,
      positionX,
      positionY,
      data
    });

    res.status(201).json({ node });
  } catch (error) {
    console.error('Create node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/:projectId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { type, positionX, positionY, data } = req.body;

    const node = await nodeService.updateNode(nodeId, {
      type,
      positionX,
      positionY,
      data
    });

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({ node });
  } catch (error) {
    console.error('Update node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    await nodeService.deleteNode(nodeId);
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
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    const nodes = await nodeService.batchUpdateNodes(updates);
    res.json({ nodes });
  } catch (error) {
    console.error('Batch update nodes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:projectId/connections', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const connections = await connectionService.getConnectionsByProject(projectId);
    res.json({ connections });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:projectId/connections', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sourceNodeId, targetNodeId, metadata } = req.body;

    const connection = await connectionService.createConnection({
      projectId,
      sourceNodeId,
      targetNodeId,
      metadata
    });

    res.status(201).json({ connection });
  } catch (error) {
    console.error('Create connection error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/:projectId/connections/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { metadata } = req.body;

    const connection = await connectionService.updateConnection(connectionId, { metadata });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({ connection });
  } catch (error) {
    console.error('Update connection error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:projectId/connections/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    await connectionService.deleteConnection(connectionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
