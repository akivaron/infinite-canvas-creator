import { fetchWithRetry } from './fetchWithRetry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export type PaymentProvider = 'Stripe' | 'PayPal' | 'Paddle' | 'LemonSqueezy';

export interface CreatePaymentParams {
  provider: PaymentProvider;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  projectId?: string;
  metadata?: Record<string, string>;
  variantId?: string;
  priceId?: string;
}

export interface PaymentResponse {
  id: string;
  url?: string;
  clientSecret?: string;
  approveUrl?: string;
  checkoutUrl?: string;
  amount: number;
  currency: string;
  status: string;
  dbId?: string;
  provider: PaymentProvider;
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

async function callPaymentFunction(endpoint: string, params: Record<string, unknown>): Promise<any> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetchWithRetry(`${supabaseUrl}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to call ${endpoint}`);
  }

  return response.json();
}

export async function createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
  const { provider, amount, currency = 'USD', ...restParams } = params;

  switch (provider) {
    case 'Stripe':
      return createStripePayment({ amount, currency, ...restParams });
    case 'PayPal':
      return createPayPalPayment({ amount, currency, ...restParams });
    case 'LemonSqueezy':
      return createLemonSqueezyPayment({ amount, currency, ...restParams });
    case 'Paddle':
      return createPaddlePayment({ amount, currency, ...restParams });
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

async function createStripePayment(params: Omit<CreatePaymentParams, 'provider'>): Promise<PaymentResponse> {
  const data = await callPaymentFunction('create-payment-intent', {
    amount: params.amount * 100,
    currency: params.currency?.toLowerCase(),
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    description: params.description,
    projectId: params.projectId,
    metadata: params.metadata,
  });

  return {
    id: data.paymentIntentId,
    clientSecret: data.clientSecret,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    dbId: data.dbId,
    provider: 'Stripe',
  };
}

async function createPayPalPayment(params: Omit<CreatePaymentParams, 'provider'>): Promise<PaymentResponse> {
  const data = await callPaymentFunction('paypal-create-order', {
    amount: params.amount * 100,
    currency: params.currency?.toUpperCase(),
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    description: params.description,
    projectId: params.projectId,
    metadata: params.metadata,
  });

  return {
    id: data.orderId,
    approveUrl: data.approveUrl,
    url: data.approveUrl,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    dbId: data.dbId,
    provider: 'PayPal',
  };
}

async function createLemonSqueezyPayment(params: Omit<CreatePaymentParams, 'provider'>): Promise<PaymentResponse> {
  const data = await callPaymentFunction('lemonsqueezy-create-checkout', {
    variantId: params.variantId || '1',
    amount: params.amount * 100,
    currency: params.currency?.toUpperCase(),
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    description: params.description,
    projectId: params.projectId,
    metadata: params.metadata,
  });

  return {
    id: data.checkoutId,
    checkoutUrl: data.checkoutUrl,
    url: data.checkoutUrl,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    dbId: data.dbId,
    provider: 'LemonSqueezy',
  };
}

async function createPaddlePayment(params: Omit<CreatePaymentParams, 'provider'>): Promise<PaymentResponse> {
  const data = await callPaymentFunction('paddle-create-transaction', {
    priceId: params.priceId || 'pri_01234',
    amount: params.amount * 100,
    currency: params.currency?.toUpperCase(),
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    description: params.description,
    projectId: params.projectId,
    metadata: params.metadata,
  });

  return {
    id: data.transactionId,
    checkoutUrl: data.checkoutUrl,
    url: data.checkoutUrl,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    dbId: data.dbId,
    provider: 'Paddle',
  };
}

export async function getPaymentIntents(projectId?: string): Promise<PaymentIntent[]> {
  const url = projectId
    ? `${API_URL}/payments/intents?projectId=${encodeURIComponent(projectId)}`
    : `${API_URL}/payments/intents`;
  const res = await fetchWithRetry(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to list payment intents');
  }
  const data = await res.json();
  return data.data ?? [];
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

export async function getPaymentIntentByTransactionId(transactionId: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('stripe_payment_intent_id', transactionId)
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
    case 'completed':
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
    case 'completed':
      return 'Completed';
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

export function getProviderDisplayName(provider: PaymentProvider): string {
  switch (provider) {
    case 'Stripe':
      return 'Stripe';
    case 'PayPal':
      return 'PayPal';
    case 'LemonSqueezy':
      return 'Lemon Squeezy';
    case 'Paddle':
      return 'Paddle';
    default:
      return provider;
  }
}

export function getProviderIcon(provider: PaymentProvider): string {
  switch (provider) {
    case 'Stripe':
      return '💳';
    case 'PayPal':
      return '🅿️';
    case 'LemonSqueezy':
      return '🍋';
    case 'Paddle':
      return '🏓';
    default:
      return '💰';
  }
}
