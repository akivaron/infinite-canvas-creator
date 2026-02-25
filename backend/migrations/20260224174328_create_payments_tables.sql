/*
  # Payment System Tables

  1. New Tables
    - `payment_intents`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `stripe_payment_intent_id` (text, unique) - Stripe payment intent ID
      - `amount` (integer) - Amount in smallest currency unit (e.g., cents)
      - `currency` (text) - Currency code (e.g., USD, EUR)
      - `status` (text) - Payment status (pending, succeeded, failed, canceled)
      - `customer_email` (text) - Customer email
      - `customer_name` (text) - Customer name
      - `description` (text) - Payment description
      - `metadata` (jsonb) - Additional payment metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payment_events`
      - `id` (uuid, primary key)
      - `payment_intent_id` (uuid, foreign key to payment_intents)
      - `event_type` (text) - Stripe event type
      - `stripe_event_id` (text, unique) - Stripe event ID
      - `payload` (jsonb) - Full event payload
      - `processed` (boolean) - Whether event was processed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Allow anonymous access for payment operations
    - Policies allow anon users to manage payments

  3. Indexes
    - Add index on stripe_payment_intent_id for fast lookups
    - Add index on project_id for project-based queries
    - Add index on stripe_event_id for webhook deduplication
*/

-- Create payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  customer_email text,
  customer_name text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_events table
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid REFERENCES payment_intents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_project_id ON payment_intents(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_id ON payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_intent_id ON payment_events(payment_intent_id);

-- Enable RLS
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Policies for payment_intents (allow anon access)
DROP POLICY IF EXISTS "Allow anon select payment_intents" ON payment_intents;
CREATE POLICY "Allow anon select payment_intents"
  ON payment_intents FOR SELECT
  TO anon
  USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon insert payment_intents" ON payment_intents;
CREATE POLICY "Allow anon insert payment_intents"
  ON payment_intents FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon update payment_intents" ON payment_intents;
CREATE POLICY "Allow anon update payment_intents"
  ON payment_intents FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

-- Policies for payment_events (allow anon access)
DROP POLICY IF EXISTS "Allow anon select payment_events" ON payment_events;
CREATE POLICY "Allow anon select payment_events"
  ON payment_events FOR SELECT
  TO anon
  USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon insert payment_events" ON payment_events;
CREATE POLICY "Allow anon insert payment_events"
  ON payment_events FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

-- Function to update payment_intents.updated_at
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_payment_intents_updated_at_trigger ON payment_intents;
CREATE TRIGGER update_payment_intents_updated_at_trigger
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();