# Payment Integration with Stripe

This project includes a complete Stripe payment integration with real-time webhook processing and database persistence.

## Features

- Create payment intents via Supabase Edge Function
- Process Stripe webhooks for payment events
- Store payment data in Supabase database
- Visual payment plan editor
- Payment history tracking

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

### `create-payment-intent`
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

### `stripe-webhook`
Processes Stripe webhook events.

**Endpoint:** `{SUPABASE_URL}/functions/v1/stripe-webhook`

**Method:** POST

**Headers:**
- `stripe-signature` - Stripe webhook signature

This endpoint is called automatically by Stripe when payment events occur.

## Setup Instructions

### 1. Get Your Stripe Keys

1. Sign up for a Stripe account at https://dashboard.stripe.com/register
2. Navigate to Developers > API keys
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2. Configure Stripe Webhook

1. Go to Developers > Webhooks in Stripe Dashboard
2. Click "Add endpoint"
3. Enter your webhook URL: `{SUPABASE_URL}/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.created`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 3. Add Environment Variables

The following environment variables are automatically configured in Supabase:

- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret
- `SUPABASE_URL` - Automatically provided
- `SUPABASE_ANON_KEY` - Automatically provided
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided

For the frontend, add to your `.env` file:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Usage

### Creating a Payment

```typescript
import { createPaymentIntent } from '@/lib/payment';

async function handlePurchase() {
  try {
    const { clientSecret } = await createPaymentIntent({
      amount: 1999, // $19.99 in cents
      currency: 'usd',
      customerEmail: 'customer@example.com',
      description: 'Premium Plan',
      metadata: {
        plan_id: 'premium',
      },
    });

    // Use clientSecret with Stripe.js to collect payment
    const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          email: 'customer@example.com',
        },
      },
    });

    if (error) {
      console.error('Payment failed:', error);
    } else {
      console.log('Payment succeeded!');
    }
  } catch (error) {
    console.error('Error creating payment:', error);
  }
}
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
