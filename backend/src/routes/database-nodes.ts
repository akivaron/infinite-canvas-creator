import { Router } from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();

router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { nodeId, displayName, projectId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!nodeId || !displayName) {
      return res.status(400).json({ error: 'nodeId and displayName are required' });
    }

    const schemaName = `db_${userId.replace(/-/g, '_')}_${nodeId.replace(/-/g, '_')}`.toLowerCase();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO database_nodes (node_id, user_id, schema_name, display_name, project_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (node_id) DO NOTHING`,
        [nodeId, userId, schemaName, displayName, projectId || null]
      );

      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          nodeId,
          schemaName,
          displayName,
          projectId
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating database node:', error);
    res.status(500).json({ error: 'Failed to create database node' });
  }
});

router.get('/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT id, node_id, schema_name, display_name, project_id, created_at, updated_at
       FROM database_nodes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error listing database nodes:', error);
    res.status(500).json({ error: 'Failed to list database nodes' });
  }
});

router.get('/:nodeId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { nodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT id, node_id, schema_name, display_name, project_id, created_at, updated_at
       FROM database_nodes
       WHERE user_id = $1 AND node_id = $2`,
      [userId, nodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Database node not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting database node:', error);
    res.status(500).json({ error: 'Failed to get database node' });
  }
});

router.post('/:nodeId/execute', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { nodeId } = req.params;
    const { sql } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const dbNodeResult = await pool.query(
      `SELECT schema_name FROM database_nodes WHERE user_id = $1 AND node_id = $2`,
      [userId, nodeId]
    );

    if (dbNodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database node not found' });
    }

    const schemaName = dbNodeResult.rows[0].schema_name;

    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);

      const result = await client.query(sql);

      res.json({
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error executing SQL:', error);
    res.status(400).json({
      error: 'SQL execution failed',
      message: error.message
    });
  }
});

router.get('/:nodeId/tables', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { nodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbNodeResult = await pool.query(
      `SELECT schema_name FROM database_nodes WHERE user_id = $1 AND node_id = $2`,
      [userId, nodeId]
    );

    if (dbNodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database node not found' });
    }

    const schemaName = dbNodeResult.rows[0].schema_name;

    const result = await pool.query(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schemaName]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ error: 'Failed to list tables' });
  }
});

router.delete('/:nodeId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { nodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbNodeResult = await pool.query(
      `SELECT schema_name FROM database_nodes WHERE user_id = $1 AND node_id = $2`,
      [userId, nodeId]
    );

    if (dbNodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database node not found' });
    }

    const schemaName = dbNodeResult.rows[0].schema_name;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);

      await client.query(
        `DELETE FROM database_nodes WHERE user_id = $1 AND node_id = $2`,
        [userId, nodeId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Database node deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting database node:', error);
    res.status(500).json({ error: 'Failed to delete database node' });
  }
});

export default router;
