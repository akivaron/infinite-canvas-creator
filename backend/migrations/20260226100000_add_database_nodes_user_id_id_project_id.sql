/*
  # Add user_id, id, project_id to database_nodes (when missing)

  Fixes: column "user_id" / "id" does not exist when table was created
  by 20260225143639 (schema without user isolation).

  Idempotent: only adds columns if they don't exist.
*/

DO $$
BEGIN
  -- Add user_id (required for auth isolation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'database_nodes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.database_nodes ADD COLUMN user_id uuid;
    UPDATE public.database_nodes SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
    ALTER TABLE public.database_nodes ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Add project_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'database_nodes' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.database_nodes ADD COLUMN project_id text;
  END IF;

  -- Add id (uuid) for API responses (DEFAULT fills existing rows)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'database_nodes' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.database_nodes ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;
END;
$$;
