/**
 * Service to authorize database access:
 * - Direct: user owns the database node (existing behavior).
 * - Via connection: when request is "as" a client node (X-Project-Id, X-Client-Node-Id),
 *   user must own the project and there must be a connection between client node and database node.
 */

import { query as metaQuery } from '../config/database.js';
import { projectService } from './projectService.js';
import { connectionService } from './connectionService.js';

export interface AccessibleDatabase {
  nodeId: string;
  schemaName: string;
  displayName: string;
}

/**
 * Returns true if the user can access the given database node.
 * - If projectId and clientNodeId are provided: requires project ownership and connection.
 * - Otherwise: only requires that the user owns the database node (direct access).
 */
export async function canAccessDatabase(
  userId: string,
  databaseNodeId: string,
  options?: { projectId?: string; clientNodeId?: string }
): Promise<boolean> {
  const { projectId, clientNodeId } = options ?? {};

  // Direct access: user must own the database node
  const row = await metaQuery(
    'SELECT 1 FROM database_nodes WHERE node_id = $1 AND user_id = $2 LIMIT 1',
    [databaseNodeId, userId]
  );
  if (row.rows.length === 0) {
    return false;
  }

  // If no "acting as" context, direct ownership is enough
  if (!projectId || !clientNodeId) {
    return true;
  }

  // Connected access: user must own the project and connection must exist
  const project = await projectService.getProjectById(projectId);
  if (!project || project.user_id !== userId) {
    return false;
  }
  return connectionService.hasConnection(projectId, clientNodeId, databaseNodeId);
}

/**
 * Returns list of database nodes that the given client node can access in the project:
 * owned by the user and connected to clientNodeId in the project.
 */
export async function getAccessibleDatabases(
  userId: string,
  projectId: string,
  clientNodeId: string
): Promise<AccessibleDatabase[]> {
  const project = await projectService.getProjectById(projectId);
  if (!project || project.user_id !== userId) {
    return [];
  }

  const connections = await metaQuery(
    `SELECT source_node_id, target_node_id
     FROM canvas_connections
     WHERE project_id = $1
       AND (source_node_id = $2 OR target_node_id = $2)`,
    [projectId, clientNodeId]
  );

  const connectedNodeIds = new Set<string>();
  for (const row of connections.rows as { source_node_id: string; target_node_id: string }[]) {
    const other = row.source_node_id === clientNodeId ? row.target_node_id : row.source_node_id;
    connectedNodeIds.add(other);
  }

  if (connectedNodeIds.size === 0) {
    return [];
  }

  const placeholders = Array.from(connectedNodeIds)
    .map((_, i) => `$${i + 2}`)
    .join(', ');
  const result = await metaQuery(
    `SELECT node_id, schema_name, display_name
     FROM database_nodes
     WHERE user_id = $1 AND node_id IN (${placeholders})`,
    [userId, ...Array.from(connectedNodeIds)]
  );

  return result.rows.map((r: any) => ({
    nodeId: r.node_id,
    schemaName: r.schema_name,
    displayName: r.display_name,
  }));
}
