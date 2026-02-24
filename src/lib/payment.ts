import { supabase } from './supabase';

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  projectId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  dbId: string;
}

export interface PaymentIntent {
  id: string;
  project_id: string | null;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  customer_email: string | null;
  customer_name: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<PaymentIntentResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create payment intent');
  }

  return response.json();
}

export async function getPaymentIntents(projectId?: string): Promise<PaymentIntent[]> {
  let query = supabase.from('payment_intents').select('*').order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPaymentIntentByStripeId(stripeId: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('stripe_payment_intent_id', stripeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'text-green-500';
    case 'pending':
    case 'processing':
      return 'text-yellow-500';
    case 'failed':
    case 'canceled':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'Succeeded';
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}
