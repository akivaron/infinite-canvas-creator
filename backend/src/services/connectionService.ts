import db from '../config/database.js';

export interface Connection {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  metadata?: any;
  created_at: Date;
}

export class ConnectionService {
  async getConnectionsByProject(projectId: string) {
    const result = await db.query(
      'SELECT * FROM canvas_connections WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    );
    return result.rows as Connection[];
  }

  async getConnectionById(connectionId: string) {
    const result = await db.query(
      'SELECT * FROM canvas_connections WHERE id = $1',
      [connectionId]
    );
    return result.rows[0] as Connection | undefined;
  }

  async createConnection(data: {
    projectId: string;
    sourceNodeId: string;
    targetNodeId: string;
    metadata?: any;
  }) {
    const result = await db.query(
      `INSERT INTO canvas_connections (project_id, source_node_id, target_node_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.projectId, data.sourceNodeId, data.targetNodeId, data.metadata || {}]
    );
    return result.rows[0] as Connection;
  }

  async updateConnection(connectionId: string, data: { metadata?: any }) {
    const result = await db.query(
      'UPDATE canvas_connections SET metadata = $1 WHERE id = $2 RETURNING *',
      [data.metadata, connectionId]
    );
    return result.rows[0] as Connection | undefined;
  }

  async deleteConnection(connectionId: string) {
    await db.query('DELETE FROM canvas_connections WHERE id = $1', [connectionId]);
  }

  async deleteConnectionsByNode(nodeId: string) {
    await db.query(
      'DELETE FROM canvas_connections WHERE source_node_id = $1 OR target_node_id = $1',
      [nodeId]
    );
  }
}

export const connectionService = new ConnectionService();
