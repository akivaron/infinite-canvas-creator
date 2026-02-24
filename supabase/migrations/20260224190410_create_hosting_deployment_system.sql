/*
  # Hosting & Deployment System

  ## Overview
  Complete hosting system with isolated deployments per user:
  - Database hosting (PostgreSQL containers)
  - API hosting (Node.js/Express containers)
  - Web hosting (Static files + CDN)
  - Storage calculation & billing
  - Resource monitoring
  - Container isolation

  ## New Tables

  ### 1. hosting_plans
  Available hosting plans with pricing
  - `id` (uuid, primary key)
  - `name` (text) - Plan name (Free, Starter, Pro, Enterprise)
  - `description` (text) - Plan description
  - `price_monthly` (decimal) - Monthly price in USD
  - `price_yearly` (decimal) - Yearly price in USD
  - `storage_gb` (integer) - Storage limit in GB
  - `bandwidth_gb` (integer) - Monthly bandwidth in GB
  - `databases` (integer) - Max databases
  - `apis` (integer) - Max API endpoints
  - `websites` (integer) - Max websites
  - `custom_domain` (boolean) - Custom domain support
  - `ssl_certificate` (boolean) - SSL support
  - `features` (jsonb) - Additional features

  ### 2. user_subscriptions
  User hosting subscriptions
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `plan_id` (uuid, foreign key to hosting_plans)
  - `status` (text) - active, cancelled, suspended, expired
  - `billing_cycle` (text) - monthly, yearly
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. deployments
  Deployed projects with container info
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `project_id` (uuid, foreign key to canvas_projects)
  - `deployment_type` (text) - web, api, database
  - `status` (text) - pending, building, running, stopped, failed
  - `container_id` (text) - Docker container ID
  - `subdomain` (text) - Generated subdomain
  - `custom_domain` (text) - Optional custom domain
  - `port` (integer) - Container port
  - `environment` (jsonb) - Environment variables
  - `build_logs` (text) - Build output
  - `deployed_at` (timestamptz)
  - `last_health_check` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. deployment_storage
  Storage usage tracking per deployment
  - `id` (uuid, primary key)
  - `deployment_id` (uuid, foreign key to deployments)
  - `user_id` (uuid, foreign key to auth.users)
  - `storage_type` (text) - code, database, static, logs
  - `size_bytes` (bigint) - Current size
  - `file_count` (integer) - Number of files
  - `last_calculated` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. deployment_metrics
  Resource usage metrics
  - `id` (uuid, primary key)
  - `deployment_id` (uuid, foreign key to deployments)
  - `timestamp` (timestamptz)
  - `cpu_usage` (float) - CPU percentage
  - `memory_usage` (bigint) - Memory in bytes
  - `bandwidth_in` (bigint) - Incoming bytes
  - `bandwidth_out` (bigint) - Outgoing bytes
  - `requests_count` (integer) - Request count
  - `response_time_avg` (float) - Avg response time ms

  ### 6. billing_invoices
  Invoice history
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `subscription_id` (uuid, foreign key to user_subscriptions)
  - `amount` (decimal) - Total amount
  - `currency` (text) - Currency code
  - `status` (text) - pending, paid, failed, refunded
  - `period_start` (timestamptz)
  - `period_end` (timestamptz)
  - `storage_cost` (decimal) - Storage charges
  - `bandwidth_cost` (decimal) - Bandwidth charges
  - `invoice_url` (text) - Invoice PDF URL
  - `paid_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 7. deployment_domains
  Custom domain management
  - `id` (uuid, primary key)
  - `deployment_id` (uuid, foreign key to deployments)
  - `user_id` (uuid, foreign key to auth.users)
  - `domain` (text) - Domain name
  - `status` (text) - pending, verified, active, failed
  - `dns_records` (jsonb) - Required DNS records
  - `ssl_status` (text) - pending, issued, active, expired
  - `ssl_expires_at` (timestamptz)
  - `verified_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only see their own deployments
  - Container isolation via Docker
  - Secure environment variables

  ## Indexes
  - deployment_id for fast queries
  - user_id for user data
  - timestamp for metrics aggregation
*/

-- ============================================================================
-- hosting_plans table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hosting_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  price_monthly decimal(10,2) NOT NULL DEFAULT 0,
  price_yearly decimal(10,2) NOT NULL DEFAULT 0,
  storage_gb integer NOT NULL DEFAULT 1,
  bandwidth_gb integer NOT NULL DEFAULT 10,
  databases integer NOT NULL DEFAULT 1,
  apis integer NOT NULL DEFAULT 3,
  websites integer NOT NULL DEFAULT 3,
  custom_domain boolean DEFAULT false,
  ssl_certificate boolean DEFAULT false,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hosting_plans_active ON hosting_plans(is_active, sort_order);

ALTER TABLE hosting_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON hosting_plans FOR SELECT
  USING (is_active = true);

-- Insert default plans
INSERT INTO hosting_plans (name, description, price_monthly, price_yearly, storage_gb, bandwidth_gb, databases, apis, websites, custom_domain, ssl_certificate, features, sort_order)
VALUES
  ('Free', 'Perfect for testing and small projects', 0, 0, 1, 10, 1, 3, 3, false, false, '["Community support", "Subdomain hosting", "Basic analytics"]'::jsonb, 1),
  ('Starter', 'For growing projects and teams', 9.99, 99.99, 10, 100, 3, 10, 10, true, true, '["Priority support", "Custom domains", "SSL certificates", "Advanced analytics", "99.9% uptime SLA"]'::jsonb, 2),
  ('Pro', 'For professional applications', 29.99, 299.99, 50, 500, 10, 50, 50, true, true, '["24/7 support", "Auto-scaling", "CDN included", "Database backups", "99.95% uptime SLA", "Team collaboration"]'::jsonb, 3),
  ('Enterprise', 'Custom solutions for large teams', 99.99, 999.99, 200, 2000, 999, 999, 999, true, true, '["Dedicated support", "Custom contracts", "SLA guarantees", "Advanced security", "Multi-region deployment", "White-label option"]'::jsonb, 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- user_subscriptions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES hosting_plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  cancel_at_period_end boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- deployments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES canvas_projects(id) ON DELETE CASCADE,
  deployment_type text NOT NULL CHECK (deployment_type IN ('web', 'api', 'database')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'running', 'stopped', 'failed', 'deleted')),
  container_id text,
  subdomain text UNIQUE,
  custom_domain text,
  port integer,
  environment jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  build_logs text DEFAULT '',
  error_message text,
  deployed_at timestamptz,
  last_health_check timestamptz,
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_subdomain ON deployments(subdomain);

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deployments"
  ON deployments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own deployments"
  ON deployments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own deployments"
  ON deployments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own deployments"
  ON deployments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- deployment_storage table
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_type text NOT NULL CHECK (storage_type IN ('code', 'database', 'static', 'logs', 'cache')),
  size_bytes bigint DEFAULT 0,
  file_count integer DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(deployment_id, storage_type)
);

CREATE INDEX IF NOT EXISTS idx_deployment_storage_deployment_id ON deployment_storage(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_storage_user_id ON deployment_storage(user_id);

ALTER TABLE deployment_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage"
  ON deployment_storage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- deployment_metrics table
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamptz DEFAULT now(),
  cpu_usage float DEFAULT 0,
  memory_usage bigint DEFAULT 0,
  bandwidth_in bigint DEFAULT 0,
  bandwidth_out bigint DEFAULT 0,
  requests_count integer DEFAULT 0,
  response_time_avg float DEFAULT 0,
  error_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_deployment_metrics_deployment_id ON deployment_metrics(deployment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_timestamp ON deployment_metrics(timestamp DESC);

ALTER TABLE deployment_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON deployment_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deployments
      WHERE deployments.id = deployment_metrics.deployment_id
      AND deployments.user_id = auth.uid()
    )
  );

-- ============================================================================
-- billing_invoices table
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES user_subscriptions(id),
  invoice_number text UNIQUE NOT NULL,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'void')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  storage_cost decimal(10,2) DEFAULT 0,
  bandwidth_cost decimal(10,2) DEFAULT 0,
  base_cost decimal(10,2) DEFAULT 0,
  invoice_url text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON billing_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON billing_invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- deployment_domains table
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'active', 'failed')),
  dns_records jsonb DEFAULT '[]'::jsonb,
  ssl_status text DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'issued', 'active', 'expired', 'failed')),
  ssl_expires_at timestamptz,
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_domains_deployment_id ON deployment_domains(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_domains_user_id ON deployment_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_domains_domain ON deployment_domains(domain);

ALTER TABLE deployment_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domains"
  ON deployment_domains FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own domains"
  ON deployment_domains FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own domains"
  ON deployment_domains FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own domains"
  ON deployment_domains FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Generate unique subdomain
CREATE OR REPLACE FUNCTION generate_subdomain(p_prefix text DEFAULT 'app')
RETURNS text AS $$
DECLARE
  v_subdomain text;
  v_exists boolean;
BEGIN
  LOOP
    v_subdomain := p_prefix || '-' || substring(md5(random()::text) from 1 for 8);
    
    SELECT EXISTS(SELECT 1 FROM deployments WHERE subdomain = v_subdomain) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_subdomain;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
BEGIN
  RETURN 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate total storage for user
CREATE OR REPLACE FUNCTION calculate_user_storage(p_user_id uuid)
RETURNS bigint AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT COALESCE(SUM(size_bytes), 0)
  INTO v_total
  FROM deployment_storage
  WHERE user_id = p_user_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate bandwidth for period
CREATE OR REPLACE FUNCTION calculate_bandwidth(p_deployment_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'bandwidth_in', COALESCE(SUM(bandwidth_in), 0),
    'bandwidth_out', COALESCE(SUM(bandwidth_out), 0),
    'total', COALESCE(SUM(bandwidth_in + bandwidth_out), 0)
  )
  INTO v_result
  FROM deployment_metrics
  WHERE deployment_id = p_deployment_id
  AND timestamp BETWEEN p_start AND p_end;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_subscription jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'plan', p.name,
    'status', s.status,
    'billing_cycle', s.billing_cycle,
    'storage_limit', p.storage_gb * 1073741824::bigint,
    'bandwidth_limit', p.bandwidth_gb * 1073741824::bigint,
    'current_period_end', s.current_period_end
  )
  INTO v_subscription
  FROM user_subscriptions s
  JOIN hosting_plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can deploy
CREATE OR REPLACE FUNCTION can_user_deploy(p_user_id uuid, p_deployment_type text)
RETURNS jsonb AS $$
DECLARE
  v_subscription jsonb;
  v_current_count integer;
  v_limit integer;
  v_can_deploy boolean;
  v_reason text;
BEGIN
  v_subscription := get_active_subscription(p_user_id);
  
  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object('can_deploy', false, 'reason', 'No active subscription');
  END IF;
  
  SELECT COUNT(*)
  INTO v_current_count
  FROM deployments
  WHERE user_id = p_user_id
  AND deployment_type = p_deployment_type
  AND status IN ('running', 'building', 'pending');
  
  SELECT CASE p_deployment_type
    WHEN 'database' THEN p.databases
    WHEN 'api' THEN p.apis
    WHEN 'web' THEN p.websites
    ELSE 0
  END
  INTO v_limit
  FROM user_subscriptions s
  JOIN hosting_plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  v_can_deploy := v_current_count < v_limit;
  v_reason := CASE 
    WHEN v_can_deploy THEN 'OK'
    ELSE format('Limit reached: %s/%s %ss', v_current_count, v_limit, p_deployment_type)
  END;
  
  RETURN jsonb_build_object(
    'can_deploy', v_can_deploy,
    'reason', v_reason,
    'current', v_current_count,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
