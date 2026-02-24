# Multi-Provider Payment Integration

This project includes complete payment integration with multiple providers: Stripe, PayPal, LemonSqueezy, and Paddle. All integrations include real-time webhook processing and database persistence.

## Supported Payment Providers

- **Stripe** - Credit/debit cards, payment intents
- **PayPal** - PayPal accounts, credit/debit cards
- **LemonSqueezy** - Merchant of record, global payments
- **Paddle** - SaaS billing, subscription management

## Features

- Multi-provider payment support (Stripe, PayPal, LemonSqueezy, Paddle)
- Unified payment API for all providers
- Real-time webhook processing
- Store payment data in Supabase database
- Visual payment plan editor
- Payment history tracking
- Automatic provider detection and routing

## Database Tables

### `payment_intents`
Stores all payment transactions:
- `id` - Unique identifier
- `project_id` - Link to project (nullable)
- `stripe_payment_intent_id` - Stripe's payment intent ID
- `amount` - Amount in cents
- `currency` - Currency code (USD, EUR, etc.)
- `status` - Payment status (pending, succeeded, failed, canceled)
- `customer_email` - Customer email
- `customer_name` - Customer name
- `description` - Payment description
- `metadata` - Additional data (JSONB)
- `created_at` / `updated_at` - Timestamps

### `payment_events`
Stores webhook events from Stripe:
- `id` - Unique identifier
- `payment_intent_id` - Link to payment_intents
- `event_type` - Stripe event type
- `stripe_event_id` - Stripe's event ID (for deduplication)
- `payload` - Full event payload (JSONB)
- `processed` - Whether event was processed
- `created_at` - Timestamp

## Edge Functions

### Stripe Functions

#### `create-payment-intent`
Creates a new Stripe payment intent.

**Endpoint:** `{SUPABASE_URL}/functions/v1/create-payment-intent`

**Method:** POST

**Request Body:**
```json
{
  "amount": 1999,
  "currency": "usd",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "description": "Premium Plan",
  "projectId": "uuid-here",
  "metadata": {
    "plan_id": "plan-123",
    "plan_name": "Premium"
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 1999,
  "currency": "usd",
  "status": "requires_payment_method",
  "dbId": "uuid-here"
}
```

#### `stripe-webhook`
Processes Stripe webhook events.

**Endpoint:** `{SUPABASE_URL}/functions/v1/stripe-webhook`

### PayPal Functions

#### `paypal-create-order`
Creates a new PayPal order.

**Endpoint:** `{SUPABASE_URL}/functions/v1/paypal-create-order`

**Response:**
```json
{
  "orderId": "ORDER-123",
  "approveUrl": "https://paypal.com/checkoutnow?token=xxx",
  "amount": 1999,
  "currency": "USD",
  "status": "CREATED"
}
```

#### `paypal-webhook`
Processes PayPal webhook events.

**Endpoint:** `{SUPABASE_URL}/functions/v1/paypal-webhook`

### LemonSqueezy Functions

#### `lemonsqueezy-create-checkout`
Creates a new LemonSqueezy checkout.

**Endpoint:** `{SUPABASE_URL}/functions/v1/lemonsqueezy-create-checkout`

**Request Body:**
```json
{
  "variantId": "123456",
  "amount": 1999,
  "currency": "USD"
}
```

**Response:**
```json
{
  "checkoutId": "checkout_123",
  "checkoutUrl": "https://lemonsqueezy.com/checkout/xxx",
  "amount": 1999,
  "currency": "USD"
}
```

#### `lemonsqueezy-webhook`
Processes LemonSqueezy webhook events.

**Endpoint:** `{SUPABASE_URL}/functions/v1/lemonsqueezy-webhook`

### Paddle Functions

#### `paddle-create-transaction`
Creates a new Paddle transaction.

**Endpoint:** `{SUPABASE_URL}/functions/v1/paddle-create-transaction`

**Request Body:**
```json
{
  "priceId": "pri_01234",
  "amount": 1999,
  "currency": "USD"
}
```

**Response:**
```json
{
  "transactionId": "txn_123",
  "checkoutUrl": "https://sandbox-checkout.paddle.com/xxx",
  "amount": 1999,
  "currency": "USD"
}
```

#### `paddle-webhook`
Processes Paddle webhook events.

**Endpoint:** `{SUPABASE_URL}/functions/v1/paddle-webhook`

## Setup Instructions

### 1. Stripe Setup

1. Sign up at https://dashboard.stripe.com/register
2. Navigate to Developers > API keys
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Configure webhook:
   - Go to Developers > Webhooks
   - Add endpoint: `{SUPABASE_URL}/functions/v1/stripe-webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
   - Copy webhook signing secret

**Environment Variables:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)

### 2. PayPal Setup

1. Sign up at https://developer.paypal.com
2. Create a REST API app
3. Copy credentials:
   - **Client ID**
   - **Client Secret**
4. Configure webhook:
   - Go to Webhooks in your app
   - Add webhook URL: `{SUPABASE_URL}/functions/v1/paypal-webhook`
   - Select events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

**Environment Variables:**
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_MODE` (sandbox or live)

### 3. LemonSqueezy Setup

1. Sign up at https://lemonsqueezy.com
2. Navigate to Settings > API
3. Create API key
4. Get your Store ID from Settings > General
5. Configure webhook:
   - Go to Settings > Webhooks
   - Add webhook URL: `{SUPABASE_URL}/functions/v1/lemonsqueezy-webhook`
   - Copy signing secret

**Environment Variables:**
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`

### 4. Paddle Setup

1. Sign up at https://paddle.com
2. Navigate to Developer Tools > Authentication
3. Create API key
4. Configure webhook:
   - Go to Developer Tools > Notifications
   - Add webhook URL: `{SUPABASE_URL}/functions/v1/paddle-webhook`
   - Select events: `transaction.created`, `transaction.completed`, `transaction.payment_failed`

**Environment Variables:**
- `PADDLE_API_KEY`
- `PADDLE_ENVIRONMENT` (sandbox or production)

### 5. Frontend Configuration

Add to your `.env` file:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Usage

### Creating a Payment (Unified API)

```typescript
import { createPayment } from '@/lib/payment';

async function handlePurchase() {
  try {
    const response = await createPayment({
      provider: 'Stripe', // or 'PayPal', 'LemonSqueezy', 'Paddle'
      amount: 1999,
      currency: 'USD',
      customerEmail: 'customer@example.com',
      description: 'Premium Plan',
      metadata: {
        plan_id: 'premium',
      },
    });

    if (response.url) {
      window.location.href = response.url;
    } else if (response.clientSecret) {
      console.log('Payment initialized:', response.clientSecret);
    }
  } catch (error) {
    console.error('Error creating payment:', error);
  }
}
```

### Provider-Specific Examples

#### Stripe
```typescript
const response = await createPayment({
  provider: 'Stripe',
  amount: 1999,
  currency: 'USD',
  customerEmail: 'customer@example.com',
  description: 'Premium Plan',
});
```

#### PayPal
```typescript
const response = await createPayment({
  provider: 'PayPal',
  amount: 1999,
  currency: 'USD',
  customerEmail: 'customer@example.com',
  description: 'Premium Plan',
});
window.location.href = response.approveUrl;
```

#### LemonSqueezy
```typescript
const response = await createPayment({
  provider: 'LemonSqueezy',
  amount: 1999,
  currency: 'USD',
  variantId: '123456',
  customerEmail: 'customer@example.com',
});
window.location.href = response.checkoutUrl;
```

#### Paddle
```typescript
const response = await createPayment({
  provider: 'Paddle',
  amount: 1999,
  currency: 'USD',
  priceId: 'pri_01234',
  customerEmail: 'customer@example.com',
});
window.location.href = response.checkoutUrl;
```

### Querying Payment History

```typescript
import { getPaymentIntents, formatCurrency } from '@/lib/payment';

async function loadPayments() {
  const payments = await getPaymentIntents();

  payments.forEach(payment => {
    console.log(`Payment: ${formatCurrency(payment.amount, payment.currency)}`);
    console.log(`Status: ${payment.status}`);
    console.log(`Created: ${new Date(payment.created_at).toLocaleDateString()}`);
  });
}
```

## Payment Flow

1. **User clicks "Purchase Plan"**
   - Frontend calls `create-payment-intent` edge function
   - Edge function creates Stripe PaymentIntent
   - Payment record saved to database with status "pending"

2. **User enters card details**
   - Stripe.js collects payment information securely
   - Frontend confirms payment with `stripe.confirmCardPayment()`

3. **Stripe processes payment**
   - Stripe sends webhook event to `stripe-webhook` edge function
   - Webhook updates payment status in database
   - Payment events are logged for audit trail

4. **Payment completed**
   - Database shows updated status (succeeded/failed)
   - User receives confirmation

## Testing

Use Stripe test cards for testing:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires authentication:** 4000 0025 0000 3155

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Security

- Never expose your secret key in frontend code
- All payment processing happens server-side via Edge Functions
- Row Level Security (RLS) protects payment data
- Webhook signature verification prevents unauthorized access
- Payment intents are idempotent (safe to retry)

## Webhook Event Types

The webhook handles these Stripe events:
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment attempt failed
- `payment_intent.canceled` - Payment was canceled
- `payment_intent.created` - New payment intent created

All events are deduplicated using `stripe_event_id` to prevent double-processing.

## Production Checklist

Before going live:

- [ ] Replace test keys with live keys
- [ ] Update Stripe webhook URL to production endpoint
- [ ] Test webhook delivery in production
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and alerts
- [ ] Review and test error handling
- [ ] Configure payment confirmation emails
- [ ] Test with real payment methods
- [ ] Verify RLS policies are secure
- [ ] Set up backup and recovery procedures

## Support

For issues or questions:
- Stripe Documentation: https://stripe.com/docs
- Supabase Documentation: https://supabase.com/docs
- Edge Functions Guide: https://supabase.com/docs/guides/functions
