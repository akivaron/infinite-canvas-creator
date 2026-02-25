import db from '../config/database.js';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
  is_public: boolean;
  metadata?: any;
  view_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Node {
  id: string;
  project_id: string;
  type: string;
  position_x: number;
  position_y: number;
  data: any;
  created_at: Date;
  updated_at: Date;
}

export interface Connection {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  metadata?: any;
  created_at: Date;
}

export class ProjectService {
  async listProjects(filters: {
    isPublic?: boolean;
    userId?: string;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { isPublic, userId, tags, search, limit = 20, offset = 0 } = filters;

    let sql = 'SELECT * FROM canvas_projects WHERE 1=1';
    const params: any[] = [];

    if (isPublic !== undefined) {
      params.push(isPublic);
      sql += ` AND is_public = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    }

    if (tags && tags.length > 0) {
      params.push(tags);
      sql += ` AND tags @> $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      sql += ` AND (name ILIKE $${params.length - 1} OR description ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);
    return result.rows as Project[];
  }

  async getProjectById(projectId: string) {
    const result = await db.query(
      'SELECT * FROM canvas_projects WHERE id = $1',
      [projectId]
    );
    return result.rows[0] as Project | undefined;
  }

  async getProjectWithDetails(projectId: string) {
    const [projectResult, nodesResult, connectionsResult] = await Promise.all([
      db.query('SELECT * FROM canvas_projects WHERE id = $1', [projectId]),
      db.query('SELECT * FROM canvas_nodes WHERE project_id = $1', [projectId]),
      db.query('SELECT * FROM canvas_connections WHERE project_id = $1', [projectId])
    ]);

    return {
      project: projectResult.rows[0] as Project | undefined,
      nodes: nodesResult.rows as Node[],
      connections: connectionsResult.rows as Connection[]
    };
  }

  async incrementViewCount(projectId: string) {
    await db.query(
      'UPDATE canvas_projects SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [projectId]
    );
  }

  async createProject(data: {
    userId: string;
    name?: string;
    description?: string;
    thumbnail?: string;
    tags?: string[];
    isPublic?: boolean;
    metadata?: any;
  }) {
    const result = await db.query(
      `INSERT INTO canvas_projects (user_id, name, description, thumbnail, tags, is_public, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId,
        data.name || 'Untitled Project',
        data.description || '',
        data.thumbnail || null,
        data.tags || [],
        data.isPublic || false,
        data.metadata || {}
      ]
    );
    return result.rows[0] as Project;
  }

  async updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    tags?: string[];
    isPublic?: boolean;
    metadata?: any;
  }) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      params.push(data.name);
      updates.push(`name = $${params.length}`);
    }
    if (data.description !== undefined) {
      params.push(data.description);
      updates.push(`description = $${params.length}`);
    }
    if (data.thumbnail !== undefined) {
      params.push(data.thumbnail);
      updates.push(`thumbnail = $${params.length}`);
    }
    if (data.tags !== undefined) {
      params.push(data.tags);
      updates.push(`tags = $${params.length}`);
    }
    if (data.isPublic !== undefined) {
      params.push(data.isPublic);
      updates.push(`is_public = $${params.length}`);
    }
    if (data.metadata !== undefined) {
      params.push(data.metadata);
      updates.push(`metadata = $${params.length}`);
    }

    params.push(new Date());
    updates.push(`updated_at = $${params.length}`);

    params.push(projectId);

    const sql = `UPDATE canvas_projects SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(sql, params);
    return result.rows[0] as Project | undefined;
  }

  async deleteProject(projectId: string) {
    await db.query('DELETE FROM canvas_projects WHERE id = $1', [projectId]);
  }

  async duplicateProject(projectId: string, userId: string) {
    const { project, nodes, connections } = await this.getProjectWithDetails(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const newProject = await this.createProject({
      userId,
      name: `${project.name} (Copy)`,
      description: project.description,
      tags: project.tags,
      isPublic: false,
      metadata: project.metadata
    });

    const nodeMapping = new Map<string, string>();

    for (const node of nodes) {
      const result = await db.query(
        `INSERT INTO canvas_nodes (project_id, type, position_x, position_y, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [newProject.id, node.type, node.position_x, node.position_y, node.data]
      );
      nodeMapping.set(node.id, result.rows[0].id);
    }

    for (const conn of connections) {
      const newSourceId = nodeMapping.get(conn.source_node_id);
      const newTargetId = nodeMapping.get(conn.target_node_id);

      if (newSourceId && newTargetId) {
        await db.query(
          `INSERT INTO canvas_connections (project_id, source_node_id, target_node_id, metadata)
           VALUES ($1, $2, $3, $4)`,
          [newProject.id, newSourceId, newTargetId, conn.metadata]
        );
      }
    }

    return newProject;
  }
}

export const projectService = new ProjectService();
