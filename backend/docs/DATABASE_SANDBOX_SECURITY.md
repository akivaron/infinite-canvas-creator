# Keamanan Database Sandbox (User Schemas)

## Situasi saat ini

- **Satu instance PostgreSQL** dipakai untuk:
  - **Database utama (app):** `public`, tabel seperti `user_profiles`, `database_nodes`, dll.
  - **Sandbox user:** schema per node, mis. `db_<user_id>_<node_id>`.

- Semua koneksi memakai **satu role** dari `DATABASE_URL` (biasanya superuser atau role dengan akses penuh).

### Risiko

| Risiko | Penjelasan |
|--------|------------|
| **Akses ke data utama** | User bisa jalankan SQL arbitrer (mis. lewat SQL Console): `SELECT * FROM public.user_profiles` atau `FROM database_nodes`. Role app punya akses ke seluruh DB. |
| **Modifikasi data utama** | Contoh: `UPDATE public.user_profiles SET ...`, `DROP TABLE public.database_nodes`. |
| **search_path** | `SET search_path TO schema_user` hanya mengatur default; query dengan nama lengkap (`public.tabel`) tetap bisa mengakses schema lain. |

Jadi: **bareng dengan database utama dengan satu role = tidak aman** jika user bisa menjalankan SQL bebas.

---

## Opsi mitigasi (best practice)

### Opsi A: Database sandbox terpisah (paling aman, direkomendasikan)

User schema **tidak** dibuat di DB yang sama dengan app, tapi di **database Postgres lain** (bisa sama instance, beda database).

- **Contoh:** DB `infinite_canvas_app` (app) vs `infinite_canvas_sandbox` (user schemas).
- Backend punya dua connection string:
  - `DATABASE_URL` → app (migrations, user_profiles, database_nodes, dll).
  - `SANDBOX_DATABASE_URL` → sandbox; hanya berisi schema user, **tanpa** tabel app.
- Semua operasi CRUD/sandbox (create schema, execute user SQL, list tables, dll.) pakai pool dari `SANDBOX_DATABASE_URL`.
- **Keuntungan:** Meskipun user jalankan SQL arbitrer, mereka **tidak bisa** mengakses `user_profiles`, `database_nodes`, dll. karena tabel itu tidak ada di DB sandbox.

Implementasi ringkas:

1. Buat database baru: `CREATE DATABASE infinite_canvas_sandbox;`
2. Di `.env` tambah: `SANDBOX_DATABASE_URL=postgres://.../infinite_canvas_sandbox`
3. Di `databaseManager` pakai pool dari `SANDBOX_DATABASE_URL` untuk semua operasi schema user (createDatabase, executeSQL, listTables, dll.).
4. Metadata “schema name per node” tetap disimpan di **app DB** (`database_nodes`), isinya hanya nama schema; schema fisiknya ada di DB sandbox.

---

### Opsi B: Role terbatas untuk eksekusi SQL user (satu instance, satu DB)

Tetap satu database, tapi **SQL yang berasal dari user** (mis. SQL Console, atau endpoint execute) dijalankan dengan **role yang tidak punya akses ke `public`**.

1. Buat role khusus:
   ```sql
   CREATE ROLE sandbox_runner NOLOGIN;
   -- Jangan grant apa pun ke public / tabel app
   ```

2. Setiap schema user: beri akses ke role itu saja:
   ```sql
   GRANT USAGE ON SCHEMA db_xxx TO sandbox_runner;
   GRANT CREATE, USAGE ON SCHEMA db_xxx TO sandbox_runner;
   ALTER DEFAULT PRIVILEGES IN SCHEMA db_xxx GRANT ALL ON TABLES TO sandbox_runner;
   ```

3. Saat menjalankan **hanya** SQL user (bukan DDL yang kita generate):
   - Ambil client dari pool, lalu `SET ROLE sandbox_runner`, jalankan SQL user, lalu `SET ROLE` kembali (atau lepas client).
   - Dengan begitu, saat SQL user jalan, privilege efektif hanya ke schema yang di-grant, tidak ke `public` atau tabel app.

Kerumitan: tiap buat schema baru harus `GRANT ... TO sandbox_runner`, dan harus konsisten memakai `SET ROLE` hanya untuk eksekusi SQL user.

---

### Opsi C: Tetap satu DB + satu role (paling tidak aman)

- Hanya bisa diterima jika **tidak ada** fitur yang mengizinkan user mengetik/mengirim SQL arbitrer (mis. tidak ada SQL Console, dan semua DDL/DML hanya dari kode kita).
- Jika ada SQL Console atau endpoint “execute arbitrary SQL”, ini **tidak aman** untuk digabung dengan data utama.

---

## Rekomendasi

- **Production / multi-tenant:** gunakan **Opsi A (database sandbox terpisah)**.
- **Development / MVP tertutup:** bisa tetap satu DB sambil rencanakan migrasi ke Opsi A; batasi atau nonaktifkan SQL Console jika memungkinkan.
- **Tetap satu DB tapi mau lebih aman:** implement **Opsi B** (role `sandbox_runner` + `SET ROLE` hanya untuk eksekusi SQL user).

Ringkas: **aman bareng dengan database utama hanya jika** akses ke data/schema utama tidak mungkin (DB terpisah atau role terbatas). Dengan satu role penuh + SQL arbitrer, **tidak aman**.
