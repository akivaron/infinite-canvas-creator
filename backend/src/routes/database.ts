import { Router, Request, Response } from 'express';
import { databaseManager } from '../services/databaseManager.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { nodeId, name } = req.body;

  if (!nodeId || !name) {
    return res.status(400).json({ error: 'nodeId and name are required' });
  }

  try {
    const schemaName = await databaseManager.createDatabase(nodeId as string, name as string);
    res.json({ schemaName, message: 'Database created successfully' });
  } catch (error: any) {
    console.error('Create database error:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

router.delete('/:nodeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);

  try {
    await databaseManager.deleteDatabase(nodeId);
    res.json({ message: 'Database deleted successfully' });
  } catch (error: any) {
    console.error('Delete database error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

router.get('/:nodeId/schema', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);

  try {
    const schemaName = await databaseManager.getSchema(nodeId);
    if (!schemaName) {
      return res.status(404).json({ error: 'Database not found' });
    }
    res.json({ schemaName });
  } catch (error: any) {
    console.error('Get schema error:', error);
    res.status(500).json({ error: error.message || 'Failed to get schema' });
  }
});

router.get('/:nodeId/tables', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);

  try {
    const tables = await databaseManager.listTables(nodeId);
    res.json({ tables });
  } catch (error: any) {
    console.error('List tables error:', error);
    res.status(500).json({ error: error.message || 'Failed to list tables' });
  }
});

router.post('/:nodeId/tables', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const { tableName, columns } = req.body;

  if (!tableName || !columns || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'tableName and columns array are required' });
  }

  try {
    await databaseManager.createTable(nodeId, tableName as string, columns);
    res.json({ message: 'Table created successfully' });
  } catch (error: any) {
    console.error('Create table error:', error);
    res.status(500).json({ error: error.message || 'Failed to create table' });
  }
});

router.delete('/:nodeId/tables/:tableName', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);

  try {
    await databaseManager.dropTable(nodeId, tableName);
    res.json({ message: 'Table deleted successfully' });
  } catch (error: any) {
    console.error('Drop table error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop table' });
  }
});

router.get('/:nodeId/tables/:tableName/schema', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);

  try {
    const schema = await databaseManager.getTableSchema(nodeId, tableName);
    res.json({ schema });
  } catch (error: any) {
    console.error('Get table schema error:', error);
    res.status(500).json({ error: error.message || 'Failed to get table schema' });
  }
});

router.post('/:nodeId/tables/:tableName/columns', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { column } = req.body;

  if (!column || !column.name || !column.type) {
    return res.status(400).json({ error: 'column with name and type is required' });
  }

  try {
    await databaseManager.addColumn(nodeId, tableName, column);
    res.json({ message: 'Column added successfully' });
  } catch (error: any) {
    console.error('Add column error:', error);
    res.status(500).json({ error: error.message || 'Failed to add column' });
  }
});

router.delete('/:nodeId/tables/:tableName/columns/:columnName', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const columnName = String(req.params.columnName);

  try {
    await databaseManager.dropColumn(nodeId, tableName, columnName);
    res.json({ message: 'Column deleted successfully' });
  } catch (error: any) {
    console.error('Drop column error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop column' });
  }
});

router.post('/:nodeId/tables/:tableName/indexes', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { indexName, columns, unique } = req.body;

  if (!indexName || !columns || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'indexName and columns array are required' });
  }

  try {
    await databaseManager.createIndex(nodeId, tableName, indexName as string, columns, unique);
    res.json({ message: 'Index created successfully' });
  } catch (error: any) {
    console.error('Create index error:', error);
    res.status(500).json({ error: error.message || 'Failed to create index' });
  }
});

router.delete('/:nodeId/indexes/:indexName', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const indexName = String(req.params.indexName);

  try {
    await databaseManager.dropIndex(nodeId, indexName);
    res.json({ message: 'Index deleted successfully' });
  } catch (error: any) {
    console.error('Drop index error:', error);
    res.status(500).json({ error: error.message || 'Failed to drop index' });
  }
});

router.post('/:nodeId/query', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const { query, params } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const result = await databaseManager.executeSQL(nodeId, query as string, params || []);
    res.json(result);
  } catch (error: any) {
    console.error('Execute SQL error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute query' });
  }
});

router.post('/:nodeId/tables/:tableName/data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data object is required' });
  }

  try {
    const result = await databaseManager.insertData(nodeId, tableName, data);
    res.json({ data: result, message: 'Data inserted successfully' });
  } catch (error: any) {
    console.error('Insert data error:', error);
    res.status(500).json({ error: error.message || 'Failed to insert data' });
  }
});

router.get('/:nodeId/tables/:tableName/data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { select, where, orderBy, limit, offset } = req.query;

  try {
    const options: any = {};
    if (select) options.select = String(select).split(',');
    if (where) options.where = JSON.parse(String(where));
    if (orderBy) options.orderBy = String(orderBy);
    if (limit) options.limit = parseInt(String(limit));
    if (offset) options.offset = parseInt(String(offset));

    const data = await databaseManager.queryData(nodeId, tableName, options);
    res.json({ data });
  } catch (error: any) {
    console.error('Query data error:', error);
    res.status(500).json({ error: error.message || 'Failed to query data' });
  }
});

router.put('/:nodeId/tables/:tableName/data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { data, where } = req.body;

  if (!data || !where || typeof data !== 'object' || typeof where !== 'object') {
    return res.status(400).json({ error: 'data and where objects are required' });
  }

  try {
    const rowCount = await databaseManager.updateData(nodeId, tableName, data, where);
    res.json({ rowCount, message: 'Data updated successfully' });
  } catch (error: any) {
    console.error('Update data error:', error);
    res.status(500).json({ error: error.message || 'Failed to update data' });
  }
});

router.delete('/:nodeId/tables/:tableName/data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const nodeId = String(req.params.nodeId);
  const tableName = String(req.params.tableName);
  const { where } = req.body;

  if (!where || typeof where !== 'object') {
    return res.status(400).json({ error: 'where object is required' });
  }

  try {
    const rowCount = await databaseManager.deleteData(nodeId, tableName, where);
    res.json({ rowCount, message: 'Data deleted successfully' });
  } catch (error: any) {
    console.error('Delete data error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete data' });
  }
});

export default router;
