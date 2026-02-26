# Akses Database via Node Terhubung (Connected Node Access)

## Ringkasan

Jika user menghubungkan **node database** ke node lain (misalnya **API**, **CLI**, **Web**, **Mobile**) di canvas, node yang terhubung tersebut **bisa mengakses** database tersebut. Akses hanya diizinkan jika ada **koneksi** di project yang sama dan user adalah **pemilik project** serta **pemilik database node**.

## Cara Kerja

1. **Koneksi di canvas**  
   User menggambar edge dari node A (mis. API) ke node B (Database) atau sebaliknya. Koneksi disimpan di `canvas_connections` (project_id, source_node_id, target_node_id).

2. **Autorisasi**  
   - **Akses langsung**: user pemilik database node → bisa akses seperti biasa (tanpa header khusus).  
   - **Akses via koneksi**: request dikirim “atas nama” node client (API/CLI/Web/Mobile) dengan header `X-Project-Id` dan `X-Client-Node-Id`. Backend memeriksa:
     - User terautentikasi (JWT).
     - User adalah pemilik project.
     - Ada koneksi antara `clientNodeId` dan `databaseNodeId` di project tersebut.
     - Database node tetap milik user (ownership tidak berubah).

3. **Tidak ada credential terpisah**  
   Akses tetap lewat backend dengan token user. Node (API/CLI/dll.) tidak dapat akses database tanpa user yang login; yang diubah hanya pengecekan “apakah node ini boleh akses database ini” berdasarkan graph koneksi.

## Keamanan

### Prinsip

| Aspek | Penjelasan |
|--------|------------|
| **Ownership** | Hanya pemilik database node yang bisa akses. Koneksi **tidak** memindahkan ownership ke node lain. |
| **Project + connection** | Saat header `X-Project-Id` dan `X-Client-Node-Id` ada, backend memastikan project milik user dan ada edge antara client node dan database node. |
| **No privilege escalation** | Satu user tidak bisa akses database user lain hanya dengan “menghubungkan” node; database node harus milik user yang sama. |
| **Backend-only** | Semua akses data lewat API backend (auth token). Connection string / credential DB tidak di-expose ke frontend atau ke “node” lain. |

### Yang dicek backend

1. **Direct access** (tanpa header koneksi):  
   `database_nodes.node_id = :nodeId AND database_nodes.user_id = :userId`

2. **Connected access** (dengan `X-Project-Id`, `X-Client-Node-Id`):  
   - Database node milik user (sama seperti di atas).  
   - Project milik user: `canvas_projects.id = projectId AND user_id = userId`.  
   - Ada koneksi: `canvas_connections` dengan `(source_node_id, target_node_id) = (clientNodeId, databaseNodeId)` atau sebaliknya, dan `project_id = projectId`.

Jika salah satu gagal → **403 Forbidden**.

### Rekomendasi tambahan

- Tetap gunakan **SANDBOX_DATABASE_URL** terpisah untuk schema user (lihat `backend/docs/DATABASE_SANDBOX_SECURITY.md`).  
- Jangan expose raw SQL atau connection string ke client; tetap pakai API backend.  
- Untuk production, pertimbangkan rate limit dan audit log per (user, project, node).

## API

### Daftar database yang bisa diakses oleh sebuah node

```http
GET /api/database/accessible?projectId=<id>&clientNodeId=<nodeId>
Authorization: Bearer <token>
```

**Response:**  
`{ "databases": [ { "nodeId", "schemaName", "displayName" }, ... ] }`

Hanya mengembalikan database yang:
- dimiliki user, dan  
- terhubung ke `clientNodeId` di `projectId` (via `canvas_connections`).

### Semua endpoint database yang memakai `:nodeId`

Jika request menyertakan header:
- `X-Project-Id: <projectId>`
- `X-Client-Node-Id: <clientNodeId>`

maka backend melakukan pengecekan koneksi. Jika node client **tidak** terhubung ke database node tersebut di project → **403**.

Endpoint yang memakai pengecekan ini (selain create/delete database dan `/accessible`):

- `GET/POST/DELETE /api/database/:nodeId/...` (schema, tables, columns, indexes, query, data).

## Frontend

### Mendapatkan daftar database untuk node (mis. API node)

```ts
import { databaseAPI } from '@/lib/database-api';

const projectId = useCanvasStore((s) => s.projectId);
const nodeId = 'api-node-id'; // id node API/CLI/Web/Mobile

const databases = await databaseAPI.getAccessibleDatabases(projectId!, nodeId);
// Pakai databases[].nodeId untuk panggil listTables, executeSQL, dll.
```

### Memanggil API database “atas nama” node terhubung

Berikan context agar header dikirim:

```ts
const context = { projectId: projectId!, clientNodeId: nodeId };

await databaseAPI.listTables(databaseNodeId, context);
await databaseAPI.executeSQL(databaseNodeId, 'SELECT * FROM users', [], context);
```

Tanpa `context`, perilaku tetap akses langsung (hanya ownership user).

### Persistensi koneksi

Agar “connected access” berfungsi, **project dan koneksi harus ada di backend** (bukan hanya di localStorage). Pastikan:

- Project disimpan lewat API (mis. save project dengan nodes + connections).  
- `canvas_connections` terisi untuk edge antara node client dan node database.

Jika project hanya di localStorage dan belum di-sync ke backend, `GET /accessible` akan mengembalikan list kosong dan request dengan header koneksi bisa 403 (karena connection tidak ditemukan di DB).

## Ringkasan alur

1. User login → token JWT.  
2. User buat project, tambah node Database dan node API, lalu **hubungkan** API → Database.  
3. Project (termasuk nodes + connections) disimpan ke backend.  
4. Di UI node API, panggil `getAccessibleDatabases(projectId, apiNodeId)` → dapat list database yang terhubung.  
5. Untuk setiap operasi ke database itu, panggil `databaseAPI.*(databaseNodeId, ..., context)` dengan `context = { projectId, clientNodeId: apiNodeId }`.  
6. Backend memverifikasi ownership + project + connection; jika valid, operasi dijalankan.

Ini memungkinkan node API/CLI/Web/Mobile “mengakses” hanya database yang memang sudah user hubungkan di canvas, dengan keamanan tetap mengandalkan ownership dan graph koneksi di backend.
