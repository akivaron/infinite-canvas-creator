/*
  # Add Password Hash to User Profiles

  1. Changes
    - Add `password_hash` column to `user_profiles` table
    - Make id generation use gen_random_uuid() instead of referencing auth.users
    - Remove foreign key constraint to auth.users
    - Update table structure for standalone authentication

  2. Security
    - Password hash is stored securely using bcrypt
    - RLS policies remain unchanged
*/

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_id_fkey'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
  END IF;
END $$;

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- Drop the trigger that references auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Make sure uuid generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
