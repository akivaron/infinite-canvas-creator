import db from '../config/database.js';

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

export class NodeService {
  async getNodesByProject(projectId: string) {
    const result = await db.query(
      'SELECT * FROM canvas_nodes WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    );
    return result.rows as Node[];
  }

  async getNodeById(nodeId: string) {
    const result = await db.query(
      'SELECT * FROM canvas_nodes WHERE id = $1',
      [nodeId]
    );
    return result.rows[0] as Node | undefined;
  }

  async createNode(data: {
    projectId: string;
    type: string;
    positionX: number;
    positionY: number;
    data: any;
  }) {
    const result = await db.query(
      `INSERT INTO canvas_nodes (project_id, type, position_x, position_y, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.projectId, data.type, data.positionX, data.positionY, data.data]
    );
    return result.rows[0] as Node;
  }

  async updateNode(nodeId: string, data: {
    type?: string;
    positionX?: number;
    positionY?: number;
    data?: any;
  }) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.type !== undefined) {
      params.push(data.type);
      updates.push(`type = $${params.length}`);
    }
    if (data.positionX !== undefined) {
      params.push(data.positionX);
      updates.push(`position_x = $${params.length}`);
    }
    if (data.positionY !== undefined) {
      params.push(data.positionY);
      updates.push(`position_y = $${params.length}`);
    }
    if (data.data !== undefined) {
      params.push(data.data);
      updates.push(`data = $${params.length}`);
    }

    params.push(new Date());
    updates.push(`updated_at = $${params.length}`);

    params.push(nodeId);

    const sql = `UPDATE canvas_nodes SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(sql, params);
    return result.rows[0] as Node | undefined;
  }

  async deleteNode(nodeId: string) {
    await db.query('DELETE FROM canvas_connections WHERE source_node_id = $1 OR target_node_id = $1', [nodeId]);
    await db.query('DELETE FROM canvas_nodes WHERE id = $1', [nodeId]);
  }

  async batchUpdateNodes(updates: Array<{ id: string; positionX?: number; positionY?: number; data?: any }>) {
    const results = await Promise.all(
      updates.map(update =>
        this.updateNode(update.id, {
          positionX: update.positionX,
          positionY: update.positionY,
          data: update.data
        })
      )
    );
    return results.filter(r => r !== undefined) as Node[];
  }
}

export const nodeService = new NodeService();
