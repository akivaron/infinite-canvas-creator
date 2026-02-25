# Backend Supabase to PostgreSQL Migration

## Files Yang Perlu Diupdate

### 1. backend/src/routes/projects.ts (653 lines)

**Yang harus dilakukan:**

Replace import:
```typescript
// OLD
import { createClient } from '@supabase/supabase-js';

// NEW
import db from '../config/database.js';
```

Replace getSupabase function:
```typescript
// DELETE this function completely
const getSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseKey);
};
```

Replace all Supabase queries dengan PostgreSQL queries:

**Pattern 1 - SELECT:**
```typescript
// OLD
const supabase = getSupabase();
const { data, error } = await supabase
  .from('canvas_projects')
  .select('*')
  .eq('id', projectId)
  .maybeSingle();

// NEW
const result = await db.query(
  'SELECT * FROM canvas_projects WHERE id = $1',
  [projectId]
);
const data = result.rows[0] || null;
const error = null;
```

**Pattern 2 - INSERT:**
```typescript
// OLD
const { data, error } = await supabase
  .from('canvas_projects')
  .insert({ name, description })
  .select()
  .single();

// NEW
const result = await db.query(
  'INSERT INTO canvas_projects (name, description) VALUES ($1, $2) RETURNING *',
  [name, description]
);
const data = result.rows[0];
const error = null;
```

**Pattern 3 - UPDATE:**
```typescript
// OLD
const { data, error } = await supabase
  .from('canvas_projects')
  .update({ name, description })
  .eq('id', projectId)
  .select()
  .single();

// NEW
const result = await db.query(
  'UPDATE canvas_projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
  [name, description, projectId]
);
const data = result.rows[0];
const error = null;
```

**Pattern 4 - DELETE:**
```typescript
// OLD
const { error } = await supabase
  .from('canvas_projects')
  .delete()
  .eq('id', projectId);

// NEW
await db.query(
  'DELETE FROM canvas_projects WHERE id = $1',
  [projectId]
);
const error = null;
```

**Pattern 5 - Complex SELECT with filters:**
```typescript
// OLD
let query = supabase
  .from('canvas_projects')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (isPublic === 'true') {
  query = query.eq('is_public', true);
}

const { data, error } = await query;

// NEW
let sql = 'SELECT * FROM canvas_projects WHERE 1=1';
const params: any[] = [];

if (isPublic === 'true') {
  params.push(true);
  sql += ` AND is_public = $${params.length}`;
}

sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
params.push(limit, offset);

const result = await db.query(sql, params);
const data = result.rows;
const error = null;
```

### 2. backend/src/services/ragService.ts (386 lines)

**Yang harus dilakukan:**

Replace import:
```typescript
// OLD
import { createClient } from '@supabase/supabase-js';

// NEW
import db from '../config/database.js';
```

Remove Supabase client initialization:
```typescript
// DELETE these lines
this.supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
```

Replace all `this.supabase.from()` calls dengan `db.query()`:

**Example - Storing embeddings:**
```typescript
// OLD
await this.supabase.from('canvas_embeddings').insert({
  canvas_id: canvasId,
  node_id: nodeId,
  content: content,
  embedding: embedding,
  metadata: metadata
});

// NEW
await db.query(
  `INSERT INTO canvas_embeddings (canvas_id, node_id, content, embedding, metadata)
   VALUES ($1, $2, $3, $4, $5)`,
  [canvasId, nodeId, content, JSON.stringify(embedding), JSON.stringify(metadata)]
);
```

**Example - Vector similarity search:**
```typescript
// OLD
const { data, error } = await this.supabase.rpc('match_canvas_nodes', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10
});

// NEW
const result = await db.query(
  `SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> $1::vector) as similarity
   FROM canvas_embeddings
   WHERE 1 - (embedding <=> $1::vector) > $2
   ORDER BY embedding <=> $1::vector
   LIMIT $3`,
  [JSON.stringify(embedding), 0.7, 10]
);
const data = result.rows;
```

**Important Notes untuk RAG Service:**

1. Vector similarity menggunakan operator `<=>` (cosine distance) dari pgvector
2. Embedding harus di-cast ke `::vector` type
3. Similarity = 1 - distance
4. Pastikan pgvector extension sudah installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

## Quick Fix Script

Karena ada banyak perubahan, berikut template untuk replace pattern umum:

### Find & Replace di Editor

1. **Remove Supabase imports:**
   - Find: `import { createClient } from '@supabase/supabase-js';`
   - Replace: `import db from '../config/database.js';`

2. **Remove getSupabase calls:**
   - Find: `const supabase = getSupabase();`
   - Replace: (delete line)

3. **Replace .from() calls:**
   - Find: `supabase.from('table_name')`
   - Replace: (convert to SQL query manually)

---

## Testing

Setelah mengupdate semua file, test dengan:

```bash
cd backend
npm run dev
```

Check for errors:
- PostgreSQL connection errors
- Query syntax errors
- Missing parameters

Test endpoints:
```bash
# Test projects endpoint
curl http://localhost:3001/api/projects

# Test RAG endpoint
curl http://localhost:3001/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

---

## Common Errors & Fixes

### Error: "Cannot find module '@supabase/supabase-js'"
**Fix:** Remove from package.json and run `npm install`

### Error: "relation does not exist"
**Fix:** Run migrations to create tables

### Error: "column does not exist"
**Fix:** Check column names match database schema

### Error: "syntax error at or near"
**Fix:** Check SQL syntax, use parameterized queries ($1, $2, etc)

---

## Helper Functions

Buat helper function untuk common operations:

```typescript
// backend/src/utils/queryHelpers.ts

export async function selectOne(table: string, where: Record<string, any>) {
  const keys = Object.keys(where);
  const values = Object.values(where);

  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
  const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;

  const result = await db.query(sql, values);
  return result.rows[0] || null;
}

export async function insertOne(table: string, data: Record<string, any>) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;

  const result = await db.query(sql, values);
  return result.rows[0];
}

export async function updateOne(
  table: string,
  data: Record<string, any>,
  where: Record<string, any>
) {
  const dataKeys = Object.keys(data);
  const dataValues = Object.values(data);
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const whereClause = whereKeys.map((key, i) =>
    `${key} = $${dataKeys.length + i + 1}`
  ).join(' AND ');

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;

  const result = await db.query(sql, [...dataValues, ...whereValues]);
  return result.rows[0];
}

export async function deleteOne(table: string, where: Record<string, any>) {
  const keys = Object.keys(where);
  const values = Object.values(where);

  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

  await db.query(sql, values);
}
```

Usage:
```typescript
import { selectOne, insertOne, updateOne, deleteOne } from '../utils/queryHelpers.js';

// Select
const project = await selectOne('canvas_projects', { id: projectId });

// Insert
const newProject = await insertOne('canvas_projects', { name, description });

// Update
const updated = await updateOne(
  'canvas_projects',
  { name: 'New Name' },
  { id: projectId }
);

// Delete
await deleteOne('canvas_projects', { id: projectId });
```

---

## Summary

**Files to update:**
1. ✅ backend/src/services/databaseSandbox.ts (DONE)
2. ⏳ backend/src/routes/projects.ts (TODO - 653 lines)
3. ⏳ backend/src/services/ragService.ts (TODO - 386 lines)

**After completion:**
- Test all endpoints
- Verify PostgreSQL connections
- Check migrations are applied
- Test RAG search functionality

**Total effort:** ~2-3 hours manual editing
**Alternative:** Use helper functions to speed up conversion
