/*
  # Domain Management System

  1. New Tables
    - `domains`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `project_id` (uuid, references projects)
      - `domain_name` (text, unique) - The full domain name (e.g., myapp.com)
      - `status` (text) - Domain status: 'pending', 'active', 'expired', 'cancelled'
      - `registrar` (text) - Domain registrar service used
      - `purchase_date` (timestamptz) - When domain was purchased
      - `expiry_date` (timestamptz) - When domain expires
      - `auto_renew` (boolean) - Whether to auto-renew
      - `nameservers` (jsonb) - Array of nameserver records
      - `dns_records` (jsonb) - DNS records configuration
      - `ssl_enabled` (boolean) - Whether SSL is enabled
      - `ssl_provider` (text) - SSL certificate provider
      - `price_paid` (decimal) - Price paid for domain
      - `currency` (text) - Currency used
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `domain_checks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `domain_name` (text) - Domain that was checked
      - `is_available` (boolean) - Whether domain is available
      - `price` (decimal) - Price if available
      - `currency` (text)
      - `registrar` (text) - Which registrar was checked
      - `checked_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only view and manage their own domains
    - Users can view their own domain checks
*/

-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  domain_name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  registrar text DEFAULT 'namecheap',
  purchase_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  auto_renew boolean DEFAULT true,
  nameservers jsonb DEFAULT '[]'::jsonb,
  dns_records jsonb DEFAULT '[]'::jsonb,
  ssl_enabled boolean DEFAULT false,
  ssl_provider text,
  price_paid decimal(10, 2),
  currency text DEFAULT 'USD',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create domain checks table
CREATE TABLE IF NOT EXISTS domain_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain_name text NOT NULL,
  is_available boolean NOT NULL,
  price decimal(10, 2),
  currency text DEFAULT 'USD',
  registrar text DEFAULT 'namecheap',
  checked_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_project_id ON domains(project_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domain_checks_user_id ON domain_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_checks_domain_name ON domain_checks(domain_name);

-- Enable Row Level Security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_checks ENABLE ROW LEVEL SECURITY;

-- Domains policies
DROP POLICY IF EXISTS "Users can view own domains" ON domains;
CREATE POLICY "Users can view own domains"
  ON domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own domains" ON domains;
CREATE POLICY "Users can insert own domains"
  ON domains FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own domains" ON domains;
CREATE POLICY "Users can update own domains"
  ON domains FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own domains" ON domains;
CREATE POLICY "Users can delete own domains"
  ON domains FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Domain checks policies
DROP POLICY IF EXISTS "Users can view own domain checks" ON domain_checks;
CREATE POLICY "Users can view own domain checks"
  ON domain_checks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own domain checks" ON domain_checks;
CREATE POLICY "Users can insert own domain checks"
  ON domain_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_domains_updated_at ON domains;
CREATE TRIGGER trigger_update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION update_domains_updated_at();

-- Add comment for documentation
COMMENT ON TABLE domains IS 'Stores domain registrations and configurations';
COMMENT ON TABLE domain_checks IS 'Logs domain availability checks';
