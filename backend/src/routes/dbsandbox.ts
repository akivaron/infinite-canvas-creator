import { Router, Request, Response } from 'express';
import { databaseSandbox } from '../services/databaseSandbox.js';

const router = Router();

router.post('/sandboxes', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sandbox = await databaseSandbox.createSandbox(userId, projectId);

    res.json({
      sandbox: {
        id: sandbox.id,
        schemaName: sandbox.schemaName,
        status: sandbox.status,
        createdAt: sandbox.createdAt,
        expiresAt: sandbox.expiresAt,
        connectionInfo: sandbox.connectionInfo,
      },
    });
  } catch (error) {
    console.error('Create database sandbox error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sandboxes', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const sandboxes = await databaseSandbox.getAllSandboxes(
      userId ? String(userId) : undefined
    );

    res.json({
      sandboxes: sandboxes.map((s) => ({
        id: s.id,
        userId: s.userId,
        projectId: s.projectId,
        schemaName: s.schemaName,
        status: s.status,
        tables: s.tables,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    console.error('List database sandboxes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sandboxes/:sandboxId', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    const sandbox = await databaseSandbox.getSandbox(sandboxId);

    if (!sandbox) {
      return res.status(404).json({ error: 'Sandbox not found or expired' });
    }

    res.json({
      sandbox: {
        id: sandbox.id,
        userId: sandbox.userId,
        projectId: sandbox.projectId,
        schemaName: sandbox.schemaName,
        status: sandbox.status,
        tables: sandbox.tables,
        createdAt: sandbox.createdAt,
        expiresAt: sandbox.expiresAt,
        connectionInfo: sandbox.connectionInfo,
      },
    });
  } catch (error) {
    console.error('Get database sandbox error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/sandboxes/:sandboxId', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    await databaseSandbox.destroySandbox(sandboxId);

    res.json({ success: true });
  } catch (error) {
    console.error('Destroy database sandbox error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/extend', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;
    const { minutes = 60 } = req.body;

    await databaseSandbox.extendSandbox(sandboxId, minutes);

    res.json({ success: true });
  } catch (error) {
    console.error('Extend database sandbox error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/query', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;
    const { query, params } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await databaseSandbox.executeQuery(sandboxId, query, params);

    res.json({ result });
  } catch (error) {
    console.error('Execute query error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/tables', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;
    const { table } = req.body;

    if (!table || !table.name || !table.columns) {
      return res.status(400).json({
        error: 'table object with name and columns is required',
      });
    }

    await databaseSandbox.createTable(sandboxId, table);

    res.json({ success: true });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sandboxes/:sandboxId/tables', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    const tables = await databaseSandbox.listTables(sandboxId);

    res.json({ tables });
  } catch (error) {
    console.error('List tables error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sandboxes/:sandboxId/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const { sandboxId, tableName } = req.params;

    const table = await databaseSandbox.describeTable(sandboxId, tableName);

    res.json({ table });
  } catch (error) {
    console.error('Describe table error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/sandboxes/:sandboxId/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const { sandboxId, tableName } = req.params;

    await databaseSandbox.dropTable(sandboxId, tableName);

    res.json({ success: true });
  } catch (error) {
    console.error('Drop table error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/tables/:tableName/data', async (req: Request, res: Response) => {
  try {
    const { sandboxId, tableName } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data is required' });
    }

    const result = await databaseSandbox.insertData(sandboxId, tableName, data);

    res.json({ result });
  } catch (error) {
    console.error('Insert data error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/clone', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;
    const { schema = 'public', tables } = req.body;

    const result = await databaseSandbox.cloneFromProduction(
      sandboxId,
      schema,
      tables
    );

    res.json({ result });
  } catch (error) {
    console.error('Clone from production error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sandboxes/:sandboxId/reset', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    await databaseSandbox.resetSandbox(sandboxId);

    res.json({ success: true });
  } catch (error) {
    console.error('Reset sandbox error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sandboxes/:sandboxId/stats', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    const stats = await databaseSandbox.getSandboxStats(sandboxId);

    res.json({ stats });
  } catch (error) {
    console.error('Get sandbox stats error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
