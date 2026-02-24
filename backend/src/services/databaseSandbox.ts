import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface DatabaseSandbox {
  id: string;
  userId: string;
  projectId: string;
  schemaName: string;
  status: 'initializing' | 'ready' | 'error' | 'destroyed';
  createdAt: Date;
  expiresAt: Date;
  tables: string[];
  connectionInfo: {
    host: string;
    port: number;
    database: string;
    schema: string;
  };
}

export interface SandboxQuery {
  query: string;
  params?: any[];
}

export interface SandboxTable {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
  }>;
  primaryKey?: string[];
  indexes?: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

export class DatabaseSandboxManager {
  private supabase: SupabaseClient;
  private sandboxes: Map<string, DatabaseSandbox> = new Map();
  private maxSandboxes: number = 100;
  private sandboxTimeout: number = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY || ''
    );

    this.initializeCleanup();
  }

  async createSandbox(
    userId: string,
    projectId: string
  ): Promise<DatabaseSandbox> {
    if (this.sandboxes.size >= this.maxSandboxes) {
      await this.cleanupExpiredSandboxes();
    }

    if (this.sandboxes.size >= this.maxSandboxes) {
      throw new Error('Maximum database sandboxes reached');
    }

    const sandboxId = uuidv4();
    const schemaName = `sandbox_${userId.substring(0, 8)}_${sandboxId.substring(0, 8)}`;

    const sandbox: DatabaseSandbox = {
      id: sandboxId,
      userId,
      projectId,
      schemaName,
      status: 'initializing',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.sandboxTimeout),
      tables: [],
      connectionInfo: {
        host: process.env.SUPABASE_DB_HOST || 'localhost',
        port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
        database: process.env.SUPABASE_DB_NAME || 'postgres',
        schema: schemaName,
      },
    };

    try {
      await this.createSchema(schemaName);

      await this.grantSchemaPermissions(schemaName, userId);

      sandbox.status = 'ready';
      this.sandboxes.set(sandboxId, sandbox);

      return sandbox;
    } catch (error) {
      sandbox.status = 'error';
      throw new Error(
        `Failed to create database sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSandbox(sandboxId: string): Promise<DatabaseSandbox | undefined> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox && new Date() > sandbox.expiresAt) {
      await this.destroySandbox(sandboxId);
      return undefined;
    }
    return sandbox;
  }

  async extendSandbox(sandboxId: string, minutes: number = 60): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }
    sandbox.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  }

  async executeQuery(
    sandboxId: string,
    query: string,
    params?: any[]
  ): Promise<{ data: any[]; rowCount: number }> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    if (sandbox.status !== 'ready') {
      throw new Error('Sandbox not ready');
    }

    const safeQuery = this.validateQuery(query);
    if (!safeQuery) {
      throw new Error('Query not allowed or potentially dangerous');
    }

    try {
      const prefixedQuery = `SET search_path TO ${sandbox.schemaName}; ${query}`;

      const { data, error } = await this.supabase.rpc('execute_sandbox_query', {
        sandbox_schema: sandbox.schemaName,
        query_text: prefixedQuery,
        query_params: params || [],
      });

      if (error) {
        throw error;
      }

      await this.extendSandbox(sandboxId, 60);

      return {
        data: data || [],
        rowCount: Array.isArray(data) ? data.length : 0,
      };
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createTable(
    sandboxId: string,
    table: SandboxTable
  ): Promise<void> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const columns = table.columns
      .map(
        (col) =>
          `${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.default ? ` DEFAULT ${col.default}` : ''}`
      )
      .join(', ');

    const primaryKey = table.primaryKey
      ? `, PRIMARY KEY (${table.primaryKey.join(', ')})`
      : '';

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${sandbox.schemaName}.${table.name} (
        ${columns}${primaryKey}
      );
    `;

    await this.executeQuery(sandboxId, createTableQuery);

    if (table.indexes) {
      for (const index of table.indexes) {
        const uniqueStr = index.unique ? 'UNIQUE' : '';
        const indexQuery = `
          CREATE ${uniqueStr} INDEX IF NOT EXISTS ${index.name}
          ON ${sandbox.schemaName}.${table.name} (${index.columns.join(', ')});
        `;
        await this.executeQuery(sandboxId, indexQuery);
      }
    }

    if (!sandbox.tables.includes(table.name)) {
      sandbox.tables.push(table.name);
    }
  }

  async dropTable(sandboxId: string, tableName: string): Promise<void> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const query = `DROP TABLE IF EXISTS ${sandbox.schemaName}.${tableName} CASCADE;`;
    await this.executeQuery(sandboxId, query);

    sandbox.tables = sandbox.tables.filter((t) => t !== tableName);
  }

  async listTables(sandboxId: string): Promise<string[]> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = '${sandbox.schemaName}'
      ORDER BY table_name;
    `;

    const { data } = await this.executeQuery(sandboxId, query);
    return data.map((row: any) => row.table_name);
  }

  async describeTable(
    sandboxId: string,
    tableName: string
  ): Promise<SandboxTable> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = '${sandbox.schemaName}'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;

    const { data: columns } = await this.executeQuery(sandboxId, columnsQuery);

    const pkQuery = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = '${sandbox.schemaName}.${tableName}'::regclass
        AND i.indisprimary;
    `;

    const { data: pkData } = await this.executeQuery(sandboxId, pkQuery);
    const primaryKey = pkData.map((row: any) => row.attname);

    return {
      name: tableName,
      columns: columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
      })),
      primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
    };
  }

  async insertData(
    sandboxId: string,
    tableName: string,
    data: Record<string, any> | Record<string, any>[]
  ): Promise<{ inserted: number }> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const records = Array.isArray(data) ? data : [data];

    if (records.length === 0) {
      return { inserted: 0 };
    }

    const columns = Object.keys(records[0]);
    const values = records
      .map(
        (record) =>
          `(${columns.map((col) => this.formatValue(record[col])).join(', ')})`
      )
      .join(', ');

    const query = `
      INSERT INTO ${sandbox.schemaName}.${tableName} (${columns.join(', ')})
      VALUES ${values};
    `;

    await this.executeQuery(sandboxId, query);

    return { inserted: records.length };
  }

  async cloneFromProduction(
    sandboxId: string,
    productionSchema: string = 'public',
    tables?: string[]
  ): Promise<{ cloned: string[] }> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const tablesToClone = tables || [];

    if (!tables) {
      const listQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${productionSchema}'
        AND table_type = 'BASE TABLE';
      `;
      const { data } = await this.executeQuery(sandboxId, listQuery);
      tablesToClone.push(...data.map((row: any) => row.table_name));
    }

    const cloned: string[] = [];

    for (const tableName of tablesToClone) {
      try {
        const createQuery = `
          CREATE TABLE ${sandbox.schemaName}.${tableName}
          AS SELECT * FROM ${productionSchema}.${tableName};
        `;
        await this.executeQuery(sandboxId, createQuery);

        cloned.push(tableName);
        if (!sandbox.tables.includes(tableName)) {
          sandbox.tables.push(tableName);
        }
      } catch (error) {
        console.error(`Failed to clone table ${tableName}:`, error);
      }
    }

    return { cloned };
  }

  async resetSandbox(sandboxId: string): Promise<void> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    for (const tableName of sandbox.tables) {
      await this.dropTable(sandboxId, tableName);
    }

    sandbox.tables = [];
  }

  async destroySandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return;
    }

    try {
      await this.dropSchema(sandbox.schemaName);
    } catch (error) {
      console.error(`Failed to drop schema ${sandbox.schemaName}:`, error);
    }

    this.sandboxes.delete(sandboxId);
  }

  async getAllSandboxes(userId?: string): Promise<DatabaseSandbox[]> {
    const sandboxes = Array.from(this.sandboxes.values());
    if (userId) {
      return sandboxes.filter((s) => s.userId === userId);
    }
    return sandboxes;
  }

  async getSandboxStats(sandboxId: string): Promise<{
    tables: number;
    totalRows: number;
    sizeBytes: number;
  }> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found or expired');
    }

    const tables = await this.listTables(sandboxId);

    let totalRows = 0;
    for (const table of tables) {
      const countQuery = `SELECT COUNT(*) as count FROM ${sandbox.schemaName}.${table};`;
      const { data } = await this.executeQuery(sandboxId, countQuery);
      totalRows += parseInt(data[0]?.count || '0');
    }

    const sizeQuery = `
      SELECT pg_total_relation_size('${sandbox.schemaName}.' || quote_ident(tablename))::bigint as size
      FROM pg_tables
      WHERE schemaname = '${sandbox.schemaName}';
    `;

    const { data: sizeData } = await this.executeQuery(sandboxId, sizeQuery);
    const sizeBytes = sizeData.reduce(
      (sum: number, row: any) => sum + parseInt(row.size || '0'),
      0
    );

    return {
      tables: tables.length,
      totalRows,
      sizeBytes,
    };
  }

  private async createSchema(schemaName: string): Promise<void> {
    const query = `CREATE SCHEMA IF NOT EXISTS ${schemaName};`;
    const { error } = await this.supabase.rpc('exec_sql', { sql: query });

    if (error) {
      throw error;
    }
  }

  private async dropSchema(schemaName: string): Promise<void> {
    const query = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`;
    const { error } = await this.supabase.rpc('exec_sql', { sql: query });

    if (error) {
      console.error(`Failed to drop schema: ${error}`);
    }
  }

  private async grantSchemaPermissions(
    schemaName: string,
    userId: string
  ): Promise<void> {
    const query = `
      GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT ALL ON TABLES TO authenticated;
    `;

    const { error } = await this.supabase.rpc('exec_sql', { sql: query });

    if (error) {
      console.error(`Failed to grant permissions: ${error}`);
    }
  }

  private validateQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase().trim();

    const dangerousPatterns = [
      /drop\s+schema/i,
      /drop\s+database/i,
      /grant\s+/i,
      /revoke\s+/i,
      /alter\s+system/i,
      /pg_terminate_backend/i,
      /pg_cancel_backend/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(lowerQuery)) {
        return false;
      }
    }

    return true;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }

  private async cleanupExpiredSandboxes(): Promise<void> {
    const now = new Date();
    const expiredSandboxes: string[] = [];

    for (const [sandboxId, sandbox] of this.sandboxes.entries()) {
      if (now > sandbox.expiresAt) {
        expiredSandboxes.push(sandboxId);
      }
    }

    for (const sandboxId of expiredSandboxes) {
      await this.destroySandbox(sandboxId);
    }
  }

  private initializeCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSandboxes().catch(console.error);
    }, 10 * 60 * 1000);
  }
}

export const databaseSandbox = new DatabaseSandboxManager();
