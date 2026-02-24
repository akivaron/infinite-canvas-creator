# Database Sandbox Documentation

Isolated database environment per user untuk testing queries dan schema changes tanpa merusak production database.

---

## 🎯 Overview

Database sandbox menyediakan:
- ✅ Isolated schema per user
- ✅ Full SQL query execution
- ✅ Table creation & management
- ✅ Data insertion & manipulation
- ✅ Clone from production (safe copy)
- ✅ Query validation & security
- ✅ Auto-cleanup expired sandboxes
- ✅ Statistics & monitoring

---

## 🏗️ Architecture

```
Production Database
  ├── public schema (production data)
  │   ├── users table
  │   ├── posts table
  │   └── comments table
  │
  ├── sandbox_user1_abc123 (User 1 sandbox)
  │   ├── users table (isolated copy)
  │   ├── posts table (isolated copy)
  │   └── test_table (custom table)
  │
  ├── sandbox_user2_def456 (User 2 sandbox)
  │   ├── products table (custom)
  │   └── orders table (custom)
  │
  └── sandbox_user3_ghi789 (User 3 sandbox)
      └── ... (isolated data)
```

**Key Points:**
- Each user gets isolated schema
- Cannot access other schemas
- Safe for testing & experimentation
- Auto-cleanup prevents bloat

---

## 📦 API Endpoints

Base URL: `http://localhost:3001/api/dbsandbox`

### Sandbox Management

#### Create Database Sandbox

```http
POST /api/dbsandbox/sandboxes
```

**Request:**
```json
{
  "userId": "user_123",
  "projectId": "proj_456"
}
```

**Response:**
```json
{
  "sandbox": {
    "id": "sandbox_abc123",
    "schemaName": "sandbox_user1_abc123",
    "status": "ready",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-01T01:00:00Z",
    "connectionInfo": {
      "host": "localhost",
      "port": 5432,
      "database": "postgres",
      "schema": "sandbox_user1_abc123"
    }
  }
}
```

#### List Sandboxes

```http
GET /api/dbsandbox/sandboxes?userId=user_123
```

**Response:**
```json
{
  "sandboxes": [
    {
      "id": "sandbox_abc123",
      "userId": "user_123",
      "projectId": "proj_456",
      "schemaName": "sandbox_user1_abc123",
      "status": "ready",
      "tables": ["users", "posts", "test_table"],
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-01T01:00:00Z"
    }
  ]
}
```

#### Get Sandbox Details

```http
GET /api/dbsandbox/sandboxes/:sandboxId
```

#### Extend Sandbox

```http
POST /api/dbsandbox/sandboxes/:sandboxId/extend
```

**Request:**
```json
{
  "minutes": 60
}
```

#### Destroy Sandbox

```http
DELETE /api/dbsandbox/sandboxes/:sandboxId
```

#### Reset Sandbox

```http
POST /api/dbsandbox/sandboxes/:sandboxId/reset
```

Drops all tables and resets to empty state.

---

### Query Execution

#### Execute SQL Query

```http
POST /api/dbsandbox/sandboxes/:sandboxId/query
```

**Request:**
```json
{
  "query": "SELECT * FROM users WHERE age > 18",
  "params": []
}
```

**Response:**
```json
{
  "result": {
    "data": [
      { "id": 1, "name": "John", "age": 25 },
      { "id": 2, "name": "Jane", "age": 30 }
    ],
    "rowCount": 2
  }
}
```

**Allowed Queries:**
- `SELECT` - Read data
- `INSERT` - Insert data
- `UPDATE` - Update data
- `DELETE` - Delete data
- `CREATE TABLE` - Create tables
- `ALTER TABLE` - Modify tables
- `DROP TABLE` - Drop tables
- `CREATE INDEX` - Create indexes

**Blocked Queries:**
- `DROP SCHEMA` - Cannot drop schemas
- `DROP DATABASE` - Cannot drop database
- `GRANT` / `REVOKE` - Cannot modify permissions
- `ALTER SYSTEM` - Cannot modify system

---

### Table Management

#### Create Table

```http
POST /api/dbsandbox/sandboxes/:sandboxId/tables
```

**Request:**
```json
{
  "table": {
    "name": "products",
    "columns": [
      {
        "name": "id",
        "type": "SERIAL",
        "nullable": false
      },
      {
        "name": "name",
        "type": "VARCHAR(255)",
        "nullable": false
      },
      {
        "name": "price",
        "type": "DECIMAL(10,2)",
        "nullable": false,
        "default": "0.00"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "default": "CURRENT_TIMESTAMP"
      }
    ],
    "primaryKey": ["id"],
    "indexes": [
      {
        "name": "idx_products_name",
        "columns": ["name"],
        "unique": false
      }
    ]
  }
}
```

#### List Tables

```http
GET /api/dbsandbox/sandboxes/:sandboxId/tables
```

**Response:**
```json
{
  "tables": ["users", "posts", "products", "orders"]
}
```

#### Describe Table

```http
GET /api/dbsandbox/sandboxes/:sandboxId/tables/:tableName
```

**Response:**
```json
{
  "table": {
    "name": "products",
    "columns": [
      {
        "name": "id",
        "type": "integer",
        "nullable": false,
        "default": "nextval('products_id_seq'::regclass)"
      },
      {
        "name": "name",
        "type": "character varying",
        "nullable": false
      },
      {
        "name": "price",
        "type": "numeric",
        "nullable": false,
        "default": "0.00"
      }
    ],
    "primaryKey": ["id"]
  }
}
```

#### Drop Table

```http
DELETE /api/dbsandbox/sandboxes/:sandboxId/tables/:tableName
```

---

### Data Operations

#### Insert Data

```http
POST /api/dbsandbox/sandboxes/:sandboxId/tables/:tableName/data
```

**Single Record:**
```json
{
  "data": {
    "name": "iPhone 15",
    "price": 999.99
  }
}
```

**Multiple Records:**
```json
{
  "data": [
    { "name": "iPhone 15", "price": 999.99 },
    { "name": "Samsung S24", "price": 899.99 },
    { "name": "Pixel 8", "price": 699.99 }
  ]
}
```

**Response:**
```json
{
  "result": {
    "inserted": 3
  }
}
```

---

### Clone from Production

#### Clone Tables

```http
POST /api/dbsandbox/sandboxes/:sandboxId/clone
```

**Clone All Tables:**
```json
{
  "schema": "public"
}
```

**Clone Specific Tables:**
```json
{
  "schema": "public",
  "tables": ["users", "posts"]
}
```

**Response:**
```json
{
  "result": {
    "cloned": ["users", "posts"]
  }
}
```

**Important:**
- Creates READ-ONLY copy
- Production data NOT affected
- Safe for testing

---

### Statistics

#### Get Sandbox Stats

```http
GET /api/dbsandbox/sandboxes/:sandboxId/stats
```

**Response:**
```json
{
  "stats": {
    "tables": 5,
    "totalRows": 1523,
    "sizeBytes": 2457600
  }
}
```

---

## 💻 Usage Examples

### Complete Workflow

```typescript
// 1. Create database sandbox
const { sandbox } = await fetch('/api/dbsandbox/sandboxes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'proj_456'
  })
}).then(r => r.json());

const sandboxId = sandbox.id;

// 2. Create custom table
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/tables`, {
  method: 'POST',
  body: JSON.stringify({
    table: {
      name: 'todos',
      columns: [
        { name: 'id', type: 'SERIAL', nullable: false },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'completed', type: 'BOOLEAN', nullable: false, default: 'FALSE' },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id']
    }
  })
});

// 3. Insert test data
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/tables/todos/data`, {
  method: 'POST',
  body: JSON.stringify({
    data: [
      { title: 'Learn React', completed: true },
      { title: 'Build app', completed: false },
      { title: 'Deploy', completed: false }
    ]
  })
});

// 4. Query data
const { result } = await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: 'SELECT * FROM todos WHERE completed = FALSE'
  })
}).then(r => r.json());

console.log('Incomplete todos:', result.data);

// 5. Update data
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: "UPDATE todos SET completed = TRUE WHERE title = 'Build app'"
  })
});

// 6. Complex queries
const { result: joinResult } = await fetch(
  `/api/dbsandbox/sandboxes/${sandboxId}/query`,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
        SELECT
          t.title,
          t.completed,
          COUNT(c.id) as comment_count
        FROM todos t
        LEFT JOIN comments c ON c.todo_id = t.id
        GROUP BY t.id, t.title, t.completed
      `
    })
  }
).then(r => r.json());

// 7. Clone from production
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/clone`, {
  method: 'POST',
  body: JSON.stringify({
    schema: 'public',
    tables: ['users']
  })
});

// 8. Test migrations
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: 'ALTER TABLE users ADD COLUMN last_login TIMESTAMP'
  })
});

// 9. Get statistics
const { stats } = await fetch(
  `/api/dbsandbox/sandboxes/${sandboxId}/stats`
).then(r => r.json());

console.log(`Tables: ${stats.tables}, Rows: ${stats.totalRows}`);

// 10. Cleanup
await fetch(`/api/dbsandbox/sandboxes/${sandboxId}`, {
  method: 'DELETE'
});
```

### Testing Schema Changes

```typescript
async function testMigration(sandboxId: string) {
  // 1. Clone current production schema
  await cloneFromProduction(sandboxId);

  // 2. Test adding new column
  await executeQuery(
    sandboxId,
    'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE'
  );

  // 3. Test data migration
  await executeQuery(
    sandboxId,
    `UPDATE users
     SET email_verified = TRUE
     WHERE email_confirmed_at IS NOT NULL`
  );

  // 4. Verify results
  const { data } = await executeQuery(
    sandboxId,
    'SELECT COUNT(*) as verified FROM users WHERE email_verified = TRUE'
  );

  console.log(`Verified users: ${data[0].verified}`);

  // 5. If successful, apply to production
  // If failed, just destroy sandbox
}
```

### React Component Example

```tsx
function DatabasePlayground({ userId }) {
  const [sandboxId, setSandboxId] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);

  const createSandbox = async () => {
    const { sandbox } = await fetch('/api/dbsandbox/sandboxes', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }).then(r => r.json());

    setSandboxId(sandbox.id);

    // Setup sample data
    await fetch(`/api/dbsandbox/sandboxes/${sandbox.id}/tables`, {
      method: 'POST',
      body: JSON.stringify({
        table: {
          name: 'users',
          columns: [
            { name: 'id', type: 'SERIAL', nullable: false },
            { name: 'name', type: 'VARCHAR(100)', nullable: false },
            { name: 'email', type: 'VARCHAR(255)', nullable: false }
          ],
          primaryKey: ['id']
        }
      })
    });

    await fetch(`/api/dbsandbox/sandboxes/${sandbox.id}/tables/users/data`, {
      method: 'POST',
      body: JSON.stringify({
        data: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ]
      })
    });
  };

  const executeQuery = async () => {
    const { result } = await fetch(
      `/api/dbsandbox/sandboxes/${sandboxId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({ query })
      }
    ).then(r => r.json());

    setResults(result);
  };

  return (
    <div>
      <h2>SQL Playground</h2>

      {!sandboxId && (
        <button onClick={createSandbox}>Create Sandbox</button>
      )}

      {sandboxId && (
        <>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter SQL query..."
            rows={5}
            style={{ width: '100%' }}
          />
          <button onClick={executeQuery}>Execute</button>

          {results && (
            <div>
              <h3>Results ({results.rowCount} rows)</h3>
              <pre>{JSON.stringify(results.data, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## 🔒 Security Features

### 1. Schema Isolation

Each sandbox gets unique schema:
```
sandbox_user1_abc123  ← User 1
sandbox_user2_def456  ← User 2
sandbox_user3_ghi789  ← User 3
```

Cannot access other schemas.

### 2. Query Validation

**Allowed:**
- SELECT, INSERT, UPDATE, DELETE
- CREATE/ALTER/DROP TABLE
- CREATE INDEX

**Blocked:**
- DROP SCHEMA
- DROP DATABASE
- GRANT/REVOKE
- ALTER SYSTEM
- System catalog modifications

### 3. Auto-Cleanup

- Default timeout: 1 hour
- Auto-cleanup every 10 minutes
- Prevents database bloat

### 4. Production Safety

**Clone Operation:**
- Read-only copy
- Production NOT affected
- Safe testing environment

### 5. Resource Limits

- Max 100 concurrent sandboxes
- Query timeout: 30 seconds
- Size monitoring

---

## 🎯 Use Cases

### 1. SQL Learning Platform

```typescript
// Students learn SQL safely
const sandbox = await createSandbox(studentId);
await setupSampleData(sandbox.id);
// Students run queries without risk
```

### 2. Migration Testing

```typescript
// Test schema changes
await cloneFromProduction(sandboxId);
await testMigration(sandboxId);
// Verify results before production
```

### 3. Query Optimization

```typescript
// Test query performance
await cloneFromProduction(sandboxId);
await executeQuery(sandboxId, slowQuery);
await executeQuery(sandboxId, optimizedQuery);
// Compare execution times
```

### 4. Data Analysis

```typescript
// Explore data safely
await cloneFromProduction(sandboxId);
await executeQuery(sandboxId, complexAnalyticsQuery);
// No risk to production
```

### 5. API Testing

```typescript
// Test API queries
await createSandbox(userId);
await setupTestData(sandboxId);
await testAPIEndpoints(sandboxId);
```

---

## 📝 Configuration

### Environment Variables

```bash
# Database config (from Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Sandbox config
MAX_DB_SANDBOXES=100
DB_SANDBOX_TIMEOUT=3600000  # 1 hour
```

---

## ✅ Benefits

1. **Safe Testing** - Cannot affect production
2. **Isolated** - Per-user schemas
3. **Full SQL** - Complete query support
4. **Clone Ready** - Copy production data
5. **Auto-Cleanup** - No manual maintenance
6. **Query Validation** - Security built-in
7. **Statistics** - Monitor usage

---

## 🎉 Summary

Database sandbox provides:
- ✅ Isolated schema per user
- ✅ Full SQL query execution
- ✅ Table CRUD operations
- ✅ Production cloning (safe)
- ✅ Query validation
- ✅ Auto-cleanup
- ✅ Statistics & monitoring

**Production-ready database testing environment!** 🚀
