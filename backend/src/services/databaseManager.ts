import { query as metaQuery } from '../config/database.js';
import { sandboxPool } from '../config/sandboxDatabase.js';

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  unique: boolean;
  references?: {
    table: string;
    column: string;
  };
}

interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

class DatabaseManager {
  /**
   * Cache of schema names per (userId,nodeId) pair.
   * Key format: `${userId}:${nodeId}`
   */
  private databases: Map<string, string> = new Map();

  /**
   * Run query against sandbox database (where user schemas live).
   * In production, SANDBOX_DATABASE_URL should point to a separate DB from DATABASE_URL.
   */
  private async sandboxQuery(sql: string, params: any[] = []) {
    try {
      const result = await sandboxPool.query(sql, params);
      return result;
    } catch (error) {
      console.error('Sandbox query error:', error);
      throw error;
    }
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  async createDatabase(userId: string, nodeId: string, name: string): Promise<string> {
    const sanitizedNodeId = this.sanitizeName(nodeId.replace(/-/g, '_'));
    const sanitizedUserId = userId.replace(/-/g, '_').toLowerCase();
    const schemaName = `db_${sanitizedUserId}_${sanitizedNodeId}`;

    try {
      // Create schema in sandbox DB
      await this.sandboxQuery(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // Track mapping in main app DB
      await metaQuery(
        `INSERT INTO database_nodes (node_id, user_id, schema_name, display_name, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (node_id) DO UPDATE
           SET schema_name = EXCLUDED.schema_name,
               display_name = EXCLUDED.display_name,
               updated_at = NOW()`,
        [nodeId, userId, schemaName, name]
      );

      this.databases.set(`${userId}:${nodeId}`, schemaName);
      return schemaName;
    } catch (error) {
      console.error('Failed to create database:', error);
      throw new Error('Failed to create database schema');
    }
  }

  async deleteDatabase(userId: string, nodeId: string): Promise<void> {
    try {
      const result = await metaQuery(
        'SELECT schema_name FROM database_nodes WHERE node_id = $1 AND user_id = $2',
        [nodeId, userId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const schemaName = result.rows[0].schema_name;

      await this.sandboxQuery(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);

      await metaQuery(
        'DELETE FROM database_nodes WHERE node_id = $1 AND user_id = $2',
        [nodeId, userId]
      );

      this.databases.delete(`${userId}:${nodeId}`);
    } catch (error) {
      console.error('Failed to delete database:', error);
      throw new Error('Failed to delete database schema');
    }
  }

  async getSchema(userId: string, nodeId: string): Promise<string | null> {
    const cacheKey = `${userId}:${nodeId}`;

    if (this.databases.has(cacheKey)) {
      return this.databases.get(cacheKey) || null;
    }

    try {
      const result = await metaQuery(
        'SELECT schema_name FROM database_nodes WHERE node_id = $1 AND user_id = $2',
        [nodeId, userId]
      );

      if (result.rows.length > 0) {
        const schemaName = result.rows[0].schema_name;
        this.databases.set(cacheKey, schemaName);
        return schemaName;
      }

      return null;
    } catch (error) {
      console.error('Failed to get schema:', error);
      return null;
    }
  }

  async createTable(
    userId: string,
    nodeId: string,
    tableName: string,
    columns: ColumnSchema[]
  ): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const columnDefs = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    });

    const foreignKeys = columns
      .filter(col => col.references)
      .map(col =>
        `FOREIGN KEY (${col.name}) REFERENCES ${schema}.${col.references!.table}(${col.references!.column})`
      );

    const allDefs = [...columnDefs, ...foreignKeys].join(', ');
    const query = `CREATE TABLE IF NOT EXISTS ${schema}.${sanitizedTableName} (${allDefs})`;

    await this.sandboxQuery(query);
  }

  async dropTable(userId: string, nodeId: string, tableName: string): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    await this.sandboxQuery(`DROP TABLE IF EXISTS ${schema}.${sanitizedTableName} CASCADE`);
  }

  async addColumn(
    userId: string,
    nodeId: string,
    tableName: string,
    column: ColumnSchema
  ): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    let columnDef = `${column.name} ${column.type}`;
    if (!column.nullable) columnDef += ' NOT NULL';
    if (column.defaultValue) columnDef += ` DEFAULT ${column.defaultValue}`;

    await this.sandboxQuery(
      `ALTER TABLE ${schema}.${sanitizedTableName} ADD COLUMN IF NOT EXISTS ${columnDef}`
    );

    if (column.unique) {
      await this.sandboxQuery(
        `CREATE UNIQUE INDEX IF NOT EXISTS ${sanitizedTableName}_${column.name}_unique
         ON ${schema}.${sanitizedTableName}(${column.name})`
      );
    }

    if (column.references) {
      await this.sandboxQuery(
        `ALTER TABLE ${schema}.${sanitizedTableName}
         ADD CONSTRAINT ${sanitizedTableName}_${column.name}_fkey
         FOREIGN KEY (${column.name})
         REFERENCES ${schema}.${column.references.table}(${column.references.column})`
      );
    }
  }

  async dropColumn(
    userId: string,
    nodeId: string,
    tableName: string,
    columnName: string
  ): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    await this.sandboxQuery(
      `ALTER TABLE ${schema}.${sanitizedTableName} DROP COLUMN IF EXISTS ${columnName} CASCADE`
    );
  }

  async createIndex(
    userId: string,
    nodeId: string,
    tableName: string,
    indexName: string,
    columns: string[],
    unique: boolean = false
  ): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const uniqueStr = unique ? 'UNIQUE' : '';
    const columnList = columns.join(', ');

    await this.sandboxQuery(
      `CREATE ${uniqueStr} INDEX IF NOT EXISTS ${indexName}
       ON ${schema}.${sanitizedTableName}(${columnList})`
    );
  }

  async dropIndex(userId: string, nodeId: string, indexName: string): Promise<void> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    await this.sandboxQuery(`DROP INDEX IF EXISTS ${schema}.${indexName}`);
  }

  async listTables(userId: string, nodeId: string): Promise<string[]> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      return [];
    }

    const result = await this.sandboxQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
      [schema]
    );

    return result.rows.map(row => row.table_name);
  }

  async getTableSchema(userId: string, nodeId: string, tableName: string): Promise<ColumnSchema[]> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      return [];
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const result = await this.sandboxQuery(
      `SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        (SELECT constraint_type FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = $1 AND tc.table_name = $2 AND ccu.column_name = c.column_name
         AND constraint_type = 'PRIMARY KEY') as is_primary
       FROM information_schema.columns c
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, sanitizedTableName]
    );

    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      primaryKey: row.is_primary === 'PRIMARY KEY',
      unique: false,
    }));
  }

  /**
   * Runs arbitrary SQL in the user's schema. Uses app DB role; user can still
   * reference public.* or other schemas. See DATABASE_SANDBOX_SECURITY.md.
   */
  async executeSQL(
    userId: string,
    nodeId: string,
    query: string,
    params: any[] = []
  ): Promise<any> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    await this.sandboxQuery(`SET search_path TO ${schema}`);

    try {
      const result = await this.sandboxQuery(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataType: f.dataTypeID })),
      };
    } finally {
      await this.sandboxQuery('RESET search_path');
    }
  }

  async insertData(
    userId: string,
    nodeId: string,
    tableName: string,
    data: Record<string, any>
  ): Promise<any> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${schema}.${sanitizedTableName} (${columns.join(', ')})
                   VALUES (${placeholders}) RETURNING *`;

    const result = await this.sandboxQuery(query, values);
    return result.rows[0];
  }

  async updateData(
    userId: string,
    nodeId: string,
    tableName: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<number> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const setColumns = Object.keys(data)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const whereColumns = Object.keys(where)
      .map((key, i) => `${key} = $${Object.keys(data).length + i + 1}`)
      .join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];
    const query = `UPDATE ${schema}.${sanitizedTableName} SET ${setColumns} WHERE ${whereColumns}`;

    const result = await this.sandboxQuery(query, values);
    return result.rowCount || 0;
  }

  async deleteData(
    userId: string,
    nodeId: string,
    tableName: string,
    where: Record<string, any>
  ): Promise<number> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const whereColumns = Object.keys(where)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');

    const values = Object.values(where);
    const query = `DELETE FROM ${schema}.${sanitizedTableName} WHERE ${whereColumns}`;

    const result = await this.sandboxQuery(query, values);
    return result.rowCount || 0;
  }

  async queryData(
    userId: string,
    nodeId: string,
    tableName: string,
    options: {
      select?: string[];
      where?: Record<string, any>;
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const schema = await this.getSchema(userId, nodeId);
    if (!schema) {
      throw new Error('Database schema not found');
    }

    const sanitizedTableName = this.sanitizeName(tableName);
    const selectClause = options.select?.join(', ') || '*';
    let query = `SELECT ${selectClause} FROM ${schema}.${sanitizedTableName}`;
    const params: any[] = [];

    if (options.where && Object.keys(options.where).length > 0) {
      const whereColumns = Object.keys(options.where)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ');
      query += ` WHERE ${whereColumns}`;
      params.push(...Object.values(options.where));
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.sandboxQuery(query, params);
    return result.rows;
  }
}

export const databaseManager = new DatabaseManager();
