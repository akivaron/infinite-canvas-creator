import { apiClient } from './api';
import { fetchWithRetry } from './fetchWithRetry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ColumnSchema {
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

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

class DatabaseAPI {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async createDatabase(nodeId: string, name: string): Promise<{ schemaName: string }> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ nodeId, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create database');
    }

    return await response.json();
  }

  async deleteDatabase(nodeId: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete database');
    }
  }

  async getSchema(nodeId: string): Promise<{ schemaName: string }> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}/schema`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get schema');
    }

    return await response.json();
  }

  async listTables(nodeId: string): Promise<string[]> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}/tables`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list tables');
    }

    const result = await response.json();
    return result.tables;
  }

  async createTable(
    nodeId: string,
    tableName: string,
    columns: ColumnSchema[]
  ): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}/tables`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tableName, columns }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create table');
    }
  }

  async dropTable(nodeId: string, tableName: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}/tables/${tableName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to drop table');
    }
  }

  async getTableSchema(nodeId: string, tableName: string): Promise<ColumnSchema[]> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/schema`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get table schema');
    }

    const result = await response.json();
    return result.schema;
  }

  async addColumn(
    nodeId: string,
    tableName: string,
    column: ColumnSchema
  ): Promise<void> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/columns`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ column }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add column');
    }
  }

  async dropColumn(
    nodeId: string,
    tableName: string,
    columnName: string
  ): Promise<void> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/columns/${columnName}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to drop column');
    }
  }

  async createIndex(
    nodeId: string,
    tableName: string,
    indexName: string,
    columns: string[],
    unique: boolean = false
  ): Promise<void> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/indexes`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ indexName, columns, unique }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create index');
    }
  }

  async dropIndex(nodeId: string, indexName: string): Promise<void> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/indexes/${indexName}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to drop index');
    }
  }

  async executeSQL(
    nodeId: string,
    query: string,
    params: any[] = []
  ): Promise<{ rows: any[]; rowCount: number; fields: any[] }> {
    const response = await fetchWithRetry(`${API_BASE_URL}/database/${nodeId}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, params }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute query');
    }

    return await response.json();
  }

  async insertData(
    nodeId: string,
    tableName: string,
    data: Record<string, any>
  ): Promise<any> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/data`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ data }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to insert data');
    }

    const result = await response.json();
    return result.data;
  }

  async queryData(
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
    const params = new URLSearchParams();
    if (options.select) params.set('select', options.select.join(','));
    if (options.where) params.set('where', JSON.stringify(options.where));
    if (options.orderBy) params.set('orderBy', options.orderBy);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/data?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to query data');
    }

    const result = await response.json();
    return result.data;
  }

  async updateData(
    nodeId: string,
    tableName: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<number> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/data`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ data, where }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update data');
    }

    const result = await response.json();
    return result.rowCount;
  }

  async deleteData(
    nodeId: string,
    tableName: string,
    where: Record<string, any>
  ): Promise<number> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/database/${nodeId}/tables/${tableName}/data`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ where }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete data');
    }

    const result = await response.json();
    return result.rowCount;
  }
}

export const databaseAPI = new DatabaseAPI();
