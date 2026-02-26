import { Router, Request, Response, NextFunction } from 'express';
import { databaseManager } from '../services/databaseManager.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { canAccessDatabase, getAccessibleDatabases } from '../services/databaseAccessService.js';

const router = Router();

/** When X-Project-Id and X-Client-Node-Id are present, require connection-based access for :nodeId routes */
async function ensureDatabaseAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const nodeId = req.params.nodeId as string;
  const userId = req.userId;
  const rawProjectId = req.headers['x-project-id'];
  const rawClientNodeId = req.headers['x-client-node-id'];
  const projectId = typeof rawProjectId === 'string' ? rawProjectId : Array.isArray(rawProjectId) ? rawProjectId[0] : undefined;
  const clientNodeId = typeof rawClientNodeId === 'string' ? rawClientNodeId : Array.isArray(rawClientNodeId) ? rawClientNodeId[0] : undefined;

  if (!nodeId || !userId) return next();

  if (projectId && clientNodeId) {
    const allowed = await canAccessDatabase(userId, nodeId, { projectId, clientNodeId });
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This node is not connected to the requested database in the given project.',
      });
    }
  }
  next();
}

/**
 * @swagger
 * /api/database/create:
 *   post:
 *     summary: Create isolated database
 *     description: Creates a new isolated PostgreSQL schema for a database node
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *               - name
 *             properties:
 *               nodeId:
 *                 type: string
 *                 description: Unique identifier for the database node
 *               name:
 *                 type: string
 *                 description: Human-readable database name
 *     responses:
 *       200:
 *         description: Database created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schemaName:
 *                   type: string
 *                   description: PostgreSQL schema name
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post('/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { nodeId, name } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!nodeId || !name) {
    return res.status(400).json({ error: 'nodeId and name are required' });
  }

  try {
    const schemaName = await databaseManager.createDatabase(userId, nodeId as string, name as string);
    res.json({ schemaName, message: 'Database created successfully' });
  } catch (error: any) {
    console.error('Create database error:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

router.delete('/:nodeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await databaseManager.deleteDatabase(userId, nodeId);
    res.json({ message: 'Database deleted successfully' });
  } catch (error: any) {
    console.error('Delete database error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

/**
 * GET /api/database/accessible?projectId=...&clientNodeId=...
 * Returns databases the client node can access (owned by user and connected in the project).
 */
router.get('/accessible', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const projectId = req.query.projectId as string | undefined;
  const clientNodeId = req.query.clientNodeId as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!projectId || !clientNodeId) {
    return res.status(400).json({ error: 'projectId and clientNodeId are required' });
  }

  try {
    const list = await getAccessibleDatabases(userId, projectId, clientNodeId);
    res.json({ databases: list });
  } catch (error: any) {
    console.error('Get accessible databases error:', error);
    res.status(500).json({ error: error.message || 'Failed to list accessible databases' });
  }
});

router.get('/:nodeId/schema', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const schemaName = await databaseManager.getSchema(userId, nodeId);
    if (!schemaName) {
      return res.status(404).json({ error: 'Database not found' });
    }
    res.json({ schemaName });
  } catch (error: any) {
    console.error('Get schema error:', error);
    res.status(500).json({ error: error.message || 'Failed to get schema' });
  }
});

router.get('/:nodeId/tables', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tables = await databaseManager.listTables(userId, nodeId);
    res.json({ tables });
  } catch (error: any) {
    console.error('List tables error:', error);
    res.status(500).json({ error: error.message || 'Failed to list tables' });
  }
});

router.post('/:nodeId/tables', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const userId = req.userId;
  const { tableName, columns } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!tableName || !columns || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'tableName and columns array are required' });
  }

  try {
    await databaseManager.createTable(userId, nodeId, tableName as string, columns);
    res.json({ message: 'Table created successfully' });
  } catch (error: any) {
    console.error('Create table error:', error);
    res.status(500).json({ error: error.message || 'Failed to create table' });
  }
});

router.delete('/:nodeId/tables/:tableName', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await databaseManager.dropTable(userId, nodeId, tableName);
    res.json({ message: 'Table deleted successfully' });
  } catch (error: any) {
    console.error('Drop table error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop table' });
  }
});

router.get('/:nodeId/tables/:tableName/schema', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const schema = await databaseManager.getTableSchema(userId, nodeId, tableName);
    res.json({ schema });
  } catch (error: any) {
    console.error('Get table schema error:', error);
    res.status(500).json({ error: error.message || 'Failed to get table schema' });
  }
});

router.post('/:nodeId/tables/:tableName/columns', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { column } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!column || !column.name || !column.type) {
    return res.status(400).json({ error: 'column with name and type is required' });
  }

  try {
    await databaseManager.addColumn(userId, nodeId, tableName, column);
    res.json({ message: 'Column added successfully' });
  } catch (error: any) {
    console.error('Add column error:', error);
    res.status(500).json({ error: error.message || 'Failed to add column' });
  }
});

router.delete('/:nodeId/tables/:tableName/columns/:columnName', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const columnName = String(req.params.columnName);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await databaseManager.dropColumn(userId, nodeId, tableName, columnName);
    res.json({ message: 'Column deleted successfully' });
  } catch (error: any) {
    console.error('Drop column error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop column' });
  }
});

router.post('/:nodeId/tables/:tableName/indexes', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { indexName, columns, unique } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!indexName || !columns || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'indexName and columns array are required' });
  }

  try {
    await databaseManager.createIndex(userId, nodeId, tableName, indexName as string, columns, unique);
    res.json({ message: 'Index created successfully' });
  } catch (error: any) {
    console.error('Create index error:', error);
    res.status(500).json({ error: error.message || 'Failed to create index' });
  }
});

router.delete('/:nodeId/indexes/:indexName', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const indexName = String(req.params.indexName);
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await databaseManager.dropIndex(userId, nodeId, indexName);
    res.json({ message: 'Index deleted successfully' });
  } catch (error: any) {
    console.error('Drop index error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop index' });
  }
});

router.post('/:nodeId/query', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const { query, params } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const result = await databaseManager.executeSQL(userId, nodeId, query as string, params || []);
    res.json(result);
  } catch (error: any) {
    console.error('Execute SQL error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute query' });
  }
});

router.post('/:nodeId/tables/:tableName/data', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { data } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data object is required' });
  }

  try {
    const result = await databaseManager.insertData(userId, nodeId, tableName, data);
    res.json({ data: result, message: 'Data inserted successfully' });
  } catch (error: any) {
    console.error('Insert data error:', error);
    res.status(500).json({ error: error.message || 'Failed to insert data' });
  }
});

router.get('/:nodeId/tables/:tableName/data', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { select, where, orderBy, limit, offset } = req.query;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const options: any = {};
    if (select) options.select = String(select).split(',');
    if (where) options.where = JSON.parse(String(where));
    if (orderBy) options.orderBy = String(orderBy);
    if (limit) options.limit = parseInt(String(limit));
    if (offset) options.offset = parseInt(String(offset));

    const data = await databaseManager.queryData(userId, nodeId, tableName, options);
    res.json({ data });
  } catch (error: any) {
    console.error('Query data error:', error);
    res.status(500).json({ error: error.message || 'Failed to query data' });
  }
});

router.put('/:nodeId/tables/:tableName/data', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { data, where } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!data || !where || typeof data !== 'object' || typeof where !== 'object') {
    return res.status(400).json({ error: 'data and where objects are required' });
  }

  try {
    const rowCount = await databaseManager.updateData(userId, nodeId, tableName, data, where);
    res.json({ rowCount, message: 'Data updated successfully' });
  } catch (error: any) {
    console.error('Update data error:', error);
    res.status(500).json({ error: error.message || 'Failed to update data' });
  }
});

router.delete('/:nodeId/tables/:tableName/data', authenticateToken, ensureDatabaseAccess, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const userId = req.userId;
  const { where } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!where || typeof where !== 'object') {
    return res.status(400).json({ error: 'where object is required' });
  }

  try {
    const rowCount = await databaseManager.deleteData(userId, nodeId, tableName, where);
    res.json({ rowCount, message: 'Data deleted successfully' });
  } catch (error: any) {
    console.error('Delete data error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete data' });
  }
});

export default router;
