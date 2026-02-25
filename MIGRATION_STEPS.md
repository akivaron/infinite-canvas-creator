# Langkah Migrasi PostgreSQL - Manual Steps

Beberapa file masih memiliki import Supabase yang perlu diupdate secara manual.

## Files yang Perlu Diupdate

### 1. src/lib/collaboration.ts
**Line 1:** Ganti
```typescript
import { supabase } from './supabase';
```
Menjadi:
```typescript
import { db } from './db';
```

Lalu ganti semua `supabase` dengan `db` dan tambahkan `.execute()` di akhir query.

### 2. src/lib/deployment.ts
Ganti import supabase dengan db dan update semua query.

### 3. src/lib/payment.ts
Ganti import supabase dengan db dan update semua query.

### 4. src/lib/versionControl.ts
Ganti import supabase dengan db dan update semua query.

## Quick Fix Command

Karena banyak file, gunakan find & replace di editor:

1. **Find:** `from './supabase'`
   **Replace:** `from './db'`

2. **Find:** `from '@/lib/supabase'`
   **Replace:** `from '@/lib/db'`

3. **Find:** `import { supabase }`
   **Replace:** `import { db }`

4. **Find:** `supabase.from(`
   **Replace:** `db.from(`

5. Tambahkan `.execute()` di akhir setiap query chain yang tidak memiliki `.single()` atau `.maybeSingle()`

## Build Test

Setelah update semua file:
```bash
npm run build
```

Pastikan tidak ada error.
