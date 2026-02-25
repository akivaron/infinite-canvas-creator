# Database Builder API - Swagger Documentation

## Overview
Dokumentasi lengkap API Database Builder telah ditambahkan ke Swagger UI. Semua 16 endpoints telah didokumentasikan dengan detail lengkap.

## Accessing Swagger UI

### Development
```
http://localhost:3001/api-docs
```

### Production
```
https://api.aicanvas.com/api-docs
```

## API Tag: Database Builder

Semua endpoints Database Builder dikelompokkan di bawah tag **"Database Builder"** di Swagger UI.

## Documented Endpoints (16 Total)

### 1. Database Operations

#### POST /api/database/create
- **Summary**: Create isolated database
- **Description**: Creates a new isolated PostgreSQL schema for a database node
- **Request Body**:
  - `nodeId` (string, required): Unique identifier for the database node
  - `name` (string, required): Human-readable database name
- **Response**: DatabaseSchema object with schemaName

#### DELETE /api/database/{nodeId}
- **Summary**: Delete database
- **Description**: Deletes isolated database schema and all data
- **Parameters**:
  - `nodeId` (path, string, required)
- **Response**: Success message

#### GET /api/database/{nodeId}/schema
- **Summary**: Get database schema name
- **Description**: Returns the PostgreSQL schema name for a database node
- **Parameters**:
  - `nodeId` (path, string, required)
- **Response**: Object with schemaName

### 2. Table Operations

#### GET /api/database/{nodeId}/tables
- **Summary**: List all tables
- **Description**: Returns list of all tables in the database
- **Parameters**:
  - `nodeId` (path, string, required)
- **Response**: Array of table names

#### POST /api/database/{nodeId}/tables
- **Summary**: Create table
- **Description**: Creates a new table with specified columns
- **Parameters**:
  - `nodeId` (path, string, required)
- **Request Body**: TableSchema object
  - `tableName` (string, required)
  - `columns` (array of ColumnSchema, required)
- **Response**: Success message

#### DELETE /api/database/{nodeId}/tables/{tableName}
- **Summary**: Drop table
- **Description**: Deletes a table and all its data
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Response**: Success message

#### GET /api/database/{nodeId}/tables/{tableName}/schema
- **Summary**: Get table schema
- **Description**: Returns column definitions for a table
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Response**: Array of ColumnSchema objects

### 3. Column Operations

#### POST /api/database/{nodeId}/tables/{tableName}/columns
- **Summary**: Add column
- **Description**: Adds a new column to an existing table
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Request Body**:
  - `column` (ColumnSchema object)
- **Response**: Success message

#### DELETE /api/database/{nodeId}/tables/{tableName}/columns/{columnName}
- **Summary**: Drop column
- **Description**: Removes a column from a table
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
  - `columnName` (path, string, required)
- **Response**: Success message

### 4. Index Operations

#### POST /api/database/{nodeId}/tables/{tableName}/indexes
- **Summary**: Create index
- **Description**: Creates an index on specified columns for performance optimization
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Request Body**:
  - `indexName` (string, required): Name of the index
  - `columns` (array of strings, required): Array of column names to index
  - `unique` (boolean): Whether to create a unique index
- **Response**: Success message

#### DELETE /api/database/{nodeId}/indexes/{indexName}
- **Summary**: Drop index
- **Description**: Removes an index from the database
- **Parameters**:
  - `nodeId` (path, string, required)
  - `indexName` (path, string, required)
- **Response**: Success message

### 5. Data Operations

#### GET /api/database/{nodeId}/tables/{tableName}/data
- **Summary**: Query data
- **Description**: Retrieves data from a table with optional filtering, sorting, and pagination
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
  - `select` (query, string): Comma-separated list of columns to select
  - `where` (query, string): JSON string of WHERE conditions
  - `orderBy` (query, string): Column to order by
  - `limit` (query, integer): Maximum number of rows
  - `offset` (query, integer): Number of rows to skip
- **Response**: Array of data objects

#### POST /api/database/{nodeId}/tables/{tableName}/data
- **Summary**: Insert data
- **Description**: Inserts a new row into a table
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Request Body**:
  - `data` (object): Row data to insert
- **Response**: Inserted row data with message

#### PUT /api/database/{nodeId}/tables/{tableName}/data
- **Summary**: Update data
- **Description**: Updates rows in a table matching WHERE conditions
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Request Body**:
  - `data` (object, required): Data to update
  - `where` (object, required): WHERE conditions
- **Response**: Row count affected

#### DELETE /api/database/{nodeId}/tables/{tableName}/data
- **Summary**: Delete data
- **Description**: Deletes rows from a table matching WHERE conditions
- **Parameters**:
  - `nodeId` (path, string, required)
  - `tableName` (path, string, required)
- **Request Body**:
  - `where` (object, required): WHERE conditions
- **Response**: Row count affected

### 6. SQL Operations

#### POST /api/database/{nodeId}/query
- **Summary**: Execute SQL query
- **Description**: Executes raw SQL query in the database
- **Parameters**:
  - `nodeId` (path, string, required)
- **Request Body**:
  - `query` (string, required): SQL query to execute
  - `params` (array, optional): Query parameters for parameterized queries
- **Response**: SQLQueryResult object
  - `rows` (array): Query result rows
  - `rowCount` (integer): Number of rows affected
  - `fields` (array): Field definitions

## Schema Definitions

### ColumnSchema
```json
{
  "name": "string (required)",
  "type": "string (required) - one of: uuid, serial, text, varchar, integer, bigint, float, decimal, boolean, date, timestamp, timestamptz, json, jsonb, array, enum, bytea",
  "primaryKey": "boolean",
  "nullable": "boolean",
  "unique": "boolean",
  "defaultValue": "string",
  "references": {
    "table": "string",
    "column": "string"
  }
}
```

### TableSchema
```json
{
  "tableName": "string (required)",
  "columns": [
    {
      "ColumnSchema object"
    }
  ]
}
```

### DatabaseSchema
```json
{
  "nodeId": "string",
  "schemaName": "string",
  "databaseName": "string"
}
```

### SQLQueryResult
```json
{
  "rows": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "rowCount": 10,
  "fields": [
    {
      "name": "column1",
      "dataTypeID": 23
    }
  ]
}
```

## Authentication

All endpoints require authentication using Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Example Requests

### Create Database
```bash
curl -X POST http://localhost:3001/api/database/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "abc123",
    "name": "My Database"
  }'
```

### Create Table
```bash
curl -X POST http://localhost:3001/api/database/abc123/tables \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "users",
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "primaryKey": true,
        "nullable": false,
        "defaultValue": "gen_random_uuid()"
      },
      {
        "name": "email",
        "type": "text",
        "unique": true,
        "nullable": false
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "defaultValue": "now()"
      }
    ]
  }'
```

### Insert Data
```bash
curl -X POST http://localhost:3001/api/database/abc123/tables/users/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'
```

### Query Data
```bash
curl -X GET "http://localhost:3001/api/database/abc123/tables/users/data?limit=10&offset=0&orderBy=created_at" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Execute SQL
```bash
curl -X POST http://localhost:3001/api/database/abc123/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users WHERE email LIKE $1 LIMIT $2",
    "params": ["%@example.com", "10"]
  }'
```

### Create Index
```bash
curl -X POST http://localhost:3001/api/database/abc123/tables/users/indexes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "indexName": "idx_users_email",
    "columns": ["email"],
    "unique": true
  }'
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (database or table doesn't exist)
- `500` - Internal Server Error

## Testing with Swagger UI

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Open Swagger UI:
   ```
   http://localhost:3001/api-docs
   ```

3. Click "Authorize" button at the top right

4. Enter your Bearer token:
   ```
   Bearer YOUR_JWT_TOKEN
   ```

5. Navigate to "Database Builder" section

6. Try out any endpoint with the "Try it out" button

7. View request/response examples

## Integration with Frontend

Frontend components menggunakan `database-api.ts` client yang memanggil endpoints ini:

```typescript
import { databaseAPI } from '@/lib/database-api';

// Create database
const schema = await databaseAPI.createDatabase(nodeId, 'My Database');

// Create table
await databaseAPI.createTable(nodeId, 'users', columns);

// Query data
const data = await databaseAPI.queryData(nodeId, 'users', {
  limit: 50,
  offset: 0,
  orderBy: 'created_at'
});

// Execute SQL
const result = await databaseAPI.executeSQL(nodeId, 'SELECT * FROM users');
```

## API Versioning

Current version: **v1**

Base path: `/api/database`

Future versions akan menggunakan versioned paths:
- v2: `/api/v2/database`
- v3: `/api/v3/database`

## Rate Limiting

API requests are limited to:
- Free tier: 100 requests/hour
- Starter: 1000 requests/hour
- Pro: 10000 requests/hour
- Enterprise: Unlimited

Rate limit headers included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Support

For API support:
- Email: support@aicanvas.com
- Documentation: https://docs.aicanvas.com/database-builder
- Swagger UI: http://localhost:3001/api-docs

## Changelog

### v1.0.0 (Current)
- Initial release
- 16 endpoints covering all database operations
- Full CRUD support for tables, columns, indexes, and data
- Raw SQL execution support
- Complete Swagger documentation
