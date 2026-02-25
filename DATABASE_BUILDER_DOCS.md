# Database Builder - Isolated Database System

## Overview
Setiap node database di canvas memiliki database PostgreSQL yang terisolasi menggunakan schema. Database secara otomatis dibuat saat node ditambahkan dan dihapus saat node dihapus.

## Features

### Isolated Database per Node
- Setiap node database memiliki PostgreSQL schema terpisah
- Schema naming: `node_db_{name}_{nodeId}`
- Automatic lifecycle management (create on add, delete on remove)
- Zero data leakage between nodes

### Complete DDL Operations
- Create/Drop tables
- Add/Drop columns
- Create/Drop indexes
- Manage primary keys, foreign keys, unique constraints
- Full column type support

### Complete DML Operations
- INSERT data
- SELECT with filtering, ordering, pagination
- UPDATE with conditions
- DELETE with conditions
- Raw SQL query execution

## API Endpoints

### Database Management

#### POST /api/database/create
Membuat database baru untuk node.

**Request:**
```json
{
  "nodeId": "node-123",
  "name": "MyDatabase"
}
```

**Response:**
```json
{
  "schemaName": "node_db_mydatabase_node_123",
  "message": "Database created successfully"
}
```

#### DELETE /api/database/:nodeId
Menghapus database dan semua data.

**Response:**
```json
{
  "message": "Database deleted successfully"
}
```

#### GET /api/database/:nodeId/schema
Get schema name untuk node.

**Response:**
```json
{
  "schemaName": "node_db_mydatabase_node_123"
}
```

### Table Operations

#### GET /api/database/:nodeId/tables
List semua tables dalam database.

**Response:**
```json
{
  "tables": ["users", "products", "orders"]
}
```

#### POST /api/database/:nodeId/tables
Create table baru.

**Request:**
```json
{
  "tableName": "users",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true,
      "nullable": false
    },
    {
      "name": "email",
      "type": "text",
      "primaryKey": false,
      "nullable": false,
      "unique": true
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "primaryKey": false,
      "nullable": false,
      "defaultValue": "now()"
    }
  ]
}
```

#### DELETE /api/database/:nodeId/tables/:tableName
Drop table.

#### GET /api/database/:nodeId/tables/:tableName/schema
Get table schema.

**Response:**
```json
{
  "schema": [
    {
      "name": "id",
      "type": "uuid",
      "nullable": false,
      "primaryKey": true,
      "unique": false
    }
  ]
}
```

### Column Operations

#### POST /api/database/:nodeId/tables/:tableName/columns
Add column ke table.

**Request:**
```json
{
  "column": {
    "name": "age",
    "type": "integer",
    "nullable": true,
    "unique": false,
    "primaryKey": false
  }
}
```

#### DELETE /api/database/:nodeId/tables/:tableName/columns/:columnName
Drop column dari table.

### Index Operations

#### POST /api/database/:nodeId/tables/:tableName/indexes
Create index.

**Request:**
```json
{
  "indexName": "users_email_idx",
  "columns": ["email"],
  "unique": true
}
```

#### DELETE /api/database/:nodeId/indexes/:indexName
Drop index.

### Data Operations

#### POST /api/database/:nodeId/tables/:tableName/data
Insert data.

**Request:**
```json
{
  "data": {
    "email": "user@example.com",
    "name": "John Doe",
    "age": 30
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "age": 30,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/database/:nodeId/tables/:tableName/data
Query data dengan filtering.

**Query Parameters:**
- `select`: Comma-separated column names
- `where`: JSON object untuk filtering
- `orderBy`: Column name dengan ASC/DESC
- `limit`: Number of rows
- `offset`: Skip rows

**Example:**
```
GET /api/database/node-123/tables/users/data?select=id,email&where={"age":30}&orderBy=created_at DESC&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com"
    }
  ]
}
```

#### PUT /api/database/:nodeId/tables/:tableName/data
Update data.

**Request:**
```json
{
  "data": {
    "age": 31
  },
  "where": {
    "email": "user@example.com"
  }
}
```

**Response:**
```json
{
  "rowCount": 1,
  "message": "Data updated successfully"
}
```

#### DELETE /api/database/:nodeId/tables/:tableName/data
Delete data.

**Request:**
```json
{
  "where": {
    "email": "user@example.com"
  }
}
```

**Response:**
```json
{
  "rowCount": 1,
  "message": "Data deleted successfully"
}
```

### Raw SQL Execution

#### POST /api/database/:nodeId/query
Execute raw SQL query.

**Request:**
```json
{
  "query": "SELECT * FROM users WHERE age > $1",
  "params": [25]
}
```

**Response:**
```json
{
  "rows": [...],
  "rowCount": 10,
  "fields": [...]
}
```

## Frontend Usage

### Import API Client
```typescript
import { databaseAPI } from '@/lib/database-api';
```

### Create Database (Automatic)
```typescript
// Otomatis dipanggil saat node database ditambahkan
const nodeId = addNode({
  type: 'database',
  title: 'My Database',
  // ...
});
```

### Create Table
```typescript
await databaseAPI.createTable(nodeId, 'users', [
  {
    name: 'id',
    type: 'uuid',
    primaryKey: true,
    nullable: false,
    unique: false,
  },
  {
    name: 'email',
    type: 'text',
    primaryKey: false,
    nullable: false,
    unique: true,
  },
]);
```

### Insert Data
```typescript
const result = await databaseAPI.insertData(nodeId, 'users', {
  email: 'user@example.com',
  name: 'John Doe',
});
```

### Query Data
```typescript
const users = await databaseAPI.queryData(nodeId, 'users', {
  where: { age: 30 },
  orderBy: 'created_at DESC',
  limit: 10,
});
```

### Update Data
```typescript
const rowCount = await databaseAPI.updateData(
  nodeId,
  'users',
  { age: 31 },
  { email: 'user@example.com' }
);
```

### Delete Data
```typescript
const rowCount = await databaseAPI.deleteData(nodeId, 'users', {
  email: 'user@example.com',
});
```

### Execute Raw SQL
```typescript
const result = await databaseAPI.executeSQL(
  nodeId,
  'SELECT * FROM users WHERE age > $1',
  [25]
);
console.log(result.rows);
```

### Delete Database (Automatic)
```typescript
// Otomatis dipanggil saat node dihapus
await removeNode(nodeId);
```

## Architecture

### Database Isolation
- PostgreSQL schemas untuk isolasi
- Naming convention: `node_db_{sanitized_name}_{short_node_id}`
- Automatic cleanup dengan CASCADE

### Security
- Semua endpoints memerlukan authentication (JWT)
- RLS policies pada tracking table
- Parameterized queries untuk prevent SQL injection
- Schema isolation untuk prevent cross-node access

### Tracking
- Table `database_nodes` tracks:
  - node_id (PK)
  - schema_name (unique)
  - display_name
  - timestamps

### Lifecycle Management
1. **Node Creation**:
   - `addNode()` dipanggil
   - Automatic `databaseAPI.createDatabase()`
   - Schema created di PostgreSQL
   - Entry added ke `database_nodes` table

2. **Node Usage**:
   - User manages tables/data via UI
   - All operations scoped to node's schema
   - Zero interference dengan databases lain

3. **Node Deletion**:
   - `removeNode()` dipanggil
   - Automatic `databaseAPI.deleteDatabase()`
   - Schema dropped dengan CASCADE
   - All data permanently deleted
   - Entry removed dari `database_nodes` table

## Column Types Supported

### PostgreSQL (SQL)
- uuid, serial, text, varchar
- integer, bigint, float, decimal
- boolean, date, timestamp, timestamptz
- json, jsonb, array, enum, bytea

### Future Support (UI only)
- NoSQL: objectId, object, map, reference
- Vector: vector, embedding, sparse_vector
- Graph: node_label, relationship, property
- TimeSeries: time, field, tag, measurement
- KeyValue: key, value, hash, sorted_set, list, ttl

## Best Practices

1. **Always use parameterized queries** untuk prevent SQL injection
2. **Clean up resources** - database otomatis dihapus saat node dihapus
3. **Use transactions** untuk operasi batch yang kompleks
4. **Add indexes** pada columns yang sering di-query
5. **Set constraints** (unique, not null, foreign keys) di schema level
6. **Use meaningful table names** - akan jadi schema name
7. **Test queries** dengan raw SQL execution sebelum production

## Limitations

1. Schema name maksimal PostgreSQL identifier length
2. Concurrent operations pada same schema harus handle di application level
3. Raw SQL dibatasi ke schema yang ter-isolasi
4. Backup/restore harus handle per-schema

## Error Handling

Semua errors dari API akan throw exception dengan message yang jelas:
```typescript
try {
  await databaseAPI.createTable(nodeId, tableName, columns);
} catch (error) {
  console.error('Failed to create table:', error.message);
}
```

## Future Enhancements

- Schema versioning dan migrations
- Database templates (pre-configured schemas)
- Visual query builder
- Data import/export
- Database cloning
- Real-time collaboration
- Query performance analytics
- Schema diff dan comparison
- Automatic backups
