const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  from(table: string): TableQuery;
}

class TableQuery {
  private table: string;
  private selectFields: string = '*';
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField: string = '';
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private insertData: any = null;
  private updateData: any = null;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*'): this {
    this.selectFields = fields;
    this.operation = 'select';
    return this;
  }

  insert(data: any): this {
    this.insertData = data;
    this.operation = 'insert';
    return this;
  }

  update(data: any): this {
    this.updateData = data;
    this.operation = 'update';
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  eq(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '=', value });
    return this;
  }

  neq(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '!=', value });
    return this;
  }

  gt(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '>', value });
    return this;
  }

  gte(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '>=', value });
    return this;
  }

  lt(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '<', value });
    return this;
  }

  lte(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '<=', value });
    return this;
  }

  like(field: string, value: string): this {
    this.whereConditions.push({ field, operator: 'LIKE', value });
    return this;
  }

  in(field: string, values: any[]): this {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderByField = `${field} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  private buildQuery(): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = '';

    if (this.operation === 'select') {
      sql = `SELECT ${this.selectFields} FROM ${this.table}`;

      if (this.whereConditions.length > 0) {
        const conditions = this.whereConditions.map((cond, index) => {
          if (cond.operator === 'IN') {
            const placeholders = (cond.value as any[]).map((_, i) => `$${params.length + i + 1}`).join(', ');
            params.push(...cond.value);
            return `${cond.field} IN (${placeholders})`;
          } else {
            params.push(cond.value);
            return `${cond.field} ${cond.operator} $${params.length}`;
          }
        });
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      if (this.orderByField) {
        sql += ` ORDER BY ${this.orderByField}`;
      }

      if (this.limitValue !== null) {
        sql += ` LIMIT ${this.limitValue}`;
      }

      if (this.offsetValue !== null) {
        sql += ` OFFSET ${this.offsetValue}`;
      }
    } else if (this.operation === 'insert') {
      const keys = Object.keys(this.insertData);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      const values = keys.map(key => this.insertData[key]);

      sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      params.push(...values);
    } else if (this.operation === 'update') {
      const keys = Object.keys(this.updateData);
      const setClauses = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      params.push(...keys.map(key => this.updateData[key]));

      sql = `UPDATE ${this.table} SET ${setClauses}`;

      if (this.whereConditions.length > 0) {
        const conditions = this.whereConditions.map((cond) => {
          params.push(cond.value);
          return `${cond.field} ${cond.operator} $${params.length}`;
        });
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' RETURNING *';
    } else if (this.operation === 'delete') {
      sql = `DELETE FROM ${this.table}`;

      if (this.whereConditions.length > 0) {
        const conditions = this.whereConditions.map((cond) => {
          params.push(cond.value);
          return `${cond.field} ${cond.operator} $${params.length}`;
        });
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' RETURNING *';
    }

    return { sql, params };
  }

  async execute<T = any>(): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const { sql, params } = this.buildQuery();

      const response = await fetch(`${API_BASE_URL}/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Database query failed');
      }

      const result = await response.json();

      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { data: null, error: error as Error };
    }
  }

  async single<T = any>(): Promise<{ data: T | null; error: Error | null }> {
    this.limit(1);
    const result = await this.execute<T>();

    if (result.error) {
      return result;
    }

    if (!result.data || result.data.length === 0) {
      return { data: null, error: new Error('No rows returned') };
    }

    return { data: result.data[0], error: null };
  }

  async maybeSingle<T = any>(): Promise<{ data: T | null; error: Error | null }> {
    this.limit(1);
    const result = await this.execute<T>();

    if (result.error) {
      return result;
    }

    return { data: result.data && result.data.length > 0 ? result.data[0] : null, error: null };
  }
}

class PostgresClient implements DatabaseClient {
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const response = await fetch(`${API_BASE_URL}/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Database query failed');
    }

    const result = await response.json();
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  }

  from(table: string): TableQuery {
    return new TableQuery(table);
  }
}

export const db = new PostgresClient();

export const createClient = () => {
  return db;
};

export default db;
