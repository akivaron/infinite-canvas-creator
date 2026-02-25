-- Local stub for Supabase auth schema so that
-- foreign keys and RLS policies referencing auth.users / auth.uid()
-- can be created in a plain PostgreSQL database.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Simple stub for auth.uid() so policies compile.
-- Returns NULL in this local setup.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULL::uuid;
$$;

