import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  projectId?: string;
  metadata?: Record<string, string>;
}

/** GET /intents?projectId= - list payment intents (optional projectId filter) */
router.get('/intents', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    let result;
    if (projectId) {
      result = await pool.query(
        'SELECT * FROM payment_intents WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM payment_intents ORDER BY created_at DESC'
      );
    }
    res.json({ data: result.rows ?? [] });
  } catch (error) {
    console.error('List payment intents error:', error);
    res.status(500).json({
      error: 'Failed to list payment intents',
      details: String(error),
    });
  }
});

router.post('/stripe/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return res.status(500).json({
        error: 'Stripe not configured. Please add your STRIPE_SECRET_KEY to environment variables.'
      });
    }

    const requestData: PaymentIntentRequest = req.body;

    const {
      amount,
      currency = 'usd',
      customerEmail,
      customerName,
      description = 'Payment',
      projectId,
      metadata = {},
    } = requestData;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const stripePayload: Record<string, unknown> = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        project_id: projectId || '',
      },
    };

    if (customerEmail) {
      stripePayload.receipt_email = customerEmail;
    }

    if (description) {
      stripePayload.description = description;
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(stripePayload as Record<string, string>).toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      return res.status(stripeResponse.status).json({
        error: 'Failed to create payment intent',
        details: errorData
      });
    }

    const paymentIntent = await stripeResponse.json();

    const result = await pool.query(
      `INSERT INTO payment_intents (
        project_id, stripe_payment_intent_id, amount, currency, status,
        customer_email, customer_name, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        projectId || null,
        paymentIntent.id,
        paymentIntent.amount,
        paymentIntent.currency,
        paymentIntent.status,
        customerEmail || null,
        customerName || null,
        description || null,
        JSON.stringify(metadata),
      ]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      dbId: result.rows[0]?.id,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: String(error)
    });
  }
});

router.post('/stripe/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'];
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeWebhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const event = req.body;

    const existingEventResult = await pool.query(
      'SELECT id FROM payment_events WHERE stripe_event_id = $1',
      [event.id]
    );

    if (existingEventResult.rows.length > 0) {
      console.log('Event already processed:', event.id);
      return res.json({ received: true, duplicate: true });
    }

    const paymentIntentId = event.data.object.id;
    let paymentIntent = null;

    const dbPaymentIntentResult = await pool.query(
      'SELECT id FROM payment_intents WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );

    if (dbPaymentIntentResult.rows.length > 0) {
      paymentIntent = dbPaymentIntentResult.rows[0];

      if (
        event.type === 'payment_intent.succeeded' ||
        event.type === 'payment_intent.payment_failed' ||
        event.type === 'payment_intent.canceled'
      ) {
        let status = 'pending';
        if (event.type === 'payment_intent.succeeded') {
          status = 'succeeded';
        } else if (event.type === 'payment_intent.payment_failed') {
          status = 'failed';
        } else if (event.type === 'payment_intent.canceled') {
          status = 'canceled';
        }

        await pool.query(
          'UPDATE payment_intents SET status = $1 WHERE id = $2',
          [status, paymentIntent.id]
        );
      }
    }

    await pool.query(
      `INSERT INTO payment_events (
        payment_intent_id, event_type, stripe_event_id, payload, processed
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        paymentIntent?.id || null,
        event.type,
        event.id,
        JSON.stringify(event),
        true,
      ]
    );

    console.log('Webhook processed successfully:', event.type);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: 'Webhook handler failed',
      details: String(error)
    });
  }
});

router.post('/paddle/create-transaction', async (req: Request, res: Response) => {
  try {
    const paddleApiKey = process.env.PADDLE_API_KEY;

    if (!paddleApiKey) {
      return res.status(500).json({
        error: 'Paddle not configured. Please add your PADDLE_API_KEY to environment variables.'
      });
    }

    const { priceId, customerId, items, customData } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const paddleResponse = await fetch('https://api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paddleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        customer_id: customerId,
        custom_data: customData,
      }),
    });

    if (!paddleResponse.ok) {
      const errorData = await paddleResponse.json();
      console.error('Paddle API error:', errorData);
      return res.status(paddleResponse.status).json({
        error: 'Failed to create transaction',
        details: errorData
      });
    }

    const transaction = await paddleResponse.json();

    res.json({
      transactionId: transaction.data?.id,
      checkoutUrl: transaction.data?.checkout?.url,
      status: transaction.data?.status,
    });
  } catch (error) {
    console.error('Paddle transaction creation error:', error);
    res.status(500).json({
      error: 'Failed to create transaction',
      details: String(error)
    });
  }
});

router.post('/paddle/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventId = event.event_id || event.id;

    const existingEventResult = await pool.query(
      'SELECT id FROM payment_events WHERE stripe_event_id = $1',
      [eventId]
    );

    if (existingEventResult.rows.length > 0) {
      console.log('Event already processed:', eventId);
      return res.json({ received: true, duplicate: true });
    }

    let paymentIntentId: string | null = null;
    let status = 'pending';

    const eventType = event.event_type;

    if (eventType === 'transaction.created') {
      paymentIntentId = event.data?.id;
      status = 'processing';
    } else if (eventType === 'transaction.completed') {
      paymentIntentId = event.data?.id;
      status = 'succeeded';
    } else if (eventType === 'transaction.payment_failed') {
      paymentIntentId = event.data?.id;
      status = 'failed';
    } else if (eventType === 'transaction.canceled') {
      paymentIntentId = event.data?.id;
      status = 'canceled';
    }

    let dbPaymentIntent = null;

    if (paymentIntentId) {
      const result = await pool.query(
        'SELECT id FROM payment_intents WHERE stripe_payment_intent_id = $1',
        [paymentIntentId]
      );

      if (result.rows.length > 0) {
        dbPaymentIntent = result.rows[0];
        await pool.query(
          'UPDATE payment_intents SET status = $1 WHERE id = $2',
          [status, dbPaymentIntent.id]
        );
      }
    }

    await pool.query(
      `INSERT INTO payment_events (
        payment_intent_id, event_type, stripe_event_id, payload, processed
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        dbPaymentIntent?.id || null,
        eventType || 'unknown',
        eventId,
        JSON.stringify(event),
        true,
      ]
    );

    console.log('Paddle webhook processed:', eventType);

    res.json({ received: true });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    res.status(400).json({
      error: 'Webhook handler failed',
      details: String(error)
    });
  }
});

router.post('/paypal/create-order', async (req: Request, res: Response) => {
  try {
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';

    if (!paypalClientId || !paypalClientSecret) {
      return res.status(500).json({
        error: 'PayPal not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.'
      });
    }

    const { amount, currency = 'USD', description = 'Payment' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const baseUrl = paypalMode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString(),
          },
          description,
        }],
      }),
    });

    const order = await orderResponse.json();

    res.json({
      orderId: order.id,
      status: order.status,
      links: order.links,
    });
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({
      error: 'Failed to create PayPal order',
      details: String(error)
    });
  }
});

router.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventId = event.id;

    const existingEventResult = await pool.query(
      'SELECT id FROM payment_events WHERE stripe_event_id = $1',
      [eventId]
    );

    if (existingEventResult.rows.length > 0) {
      console.log('Event already processed:', eventId);
      return res.json({ received: true, duplicate: true });
    }

    await pool.query(
      `INSERT INTO payment_events (
        event_type, stripe_event_id, payload, processed
      ) VALUES ($1, $2, $3, $4)`,
      [
        event.event_type || 'unknown',
        eventId,
        JSON.stringify(event),
        true,
      ]
    );

    console.log('PayPal webhook processed:', event.event_type);

    res.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(400).json({
      error: 'Webhook handler failed',
      details: String(error)
    });
  }
});

router.post('/lemonsqueezy/create-checkout', async (req: Request, res: Response) => {
  try {
    const lemonSqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY;

    if (!lemonSqueezyApiKey) {
      return res.status(500).json({
        error: 'LemonSqueezy not configured. Please add your LEMONSQUEEZY_API_KEY.'
      });
    }

    const { storeId, variantId, customData } = req.body;

    if (!storeId || !variantId) {
      return res.status(400).json({ error: 'storeId and variantId are required' });
    }

    const checkoutResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lemonSqueezyApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: customData || {},
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId.toString(),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId.toString(),
              },
            },
          },
        },
      }),
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error('LemonSqueezy API error:', errorData);
      return res.status(checkoutResponse.status).json({
        error: 'Failed to create checkout',
        details: errorData
      });
    }

    const checkout = await checkoutResponse.json();

    res.json({
      checkoutId: checkout.data?.id,
      checkoutUrl: checkout.data?.attributes?.url,
      status: checkout.data?.attributes?.status,
    });
  } catch (error) {
    console.error('LemonSqueezy checkout creation error:', error);
    res.status(500).json({
      error: 'Failed to create checkout',
      details: String(error)
    });
  }
});

router.post('/lemonsqueezy/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventId = event.meta?.event_id || event.id;

    const existingEventResult = await pool.query(
      'SELECT id FROM payment_events WHERE stripe_event_id = $1',
      [eventId]
    );

    if (existingEventResult.rows.length > 0) {
      console.log('Event already processed:', eventId);
      return res.json({ received: true, duplicate: true });
    }

    await pool.query(
      `INSERT INTO payment_events (
        event_type, stripe_event_id, payload, processed
      ) VALUES ($1, $2, $3, $4)`,
      [
        event.meta?.event_name || 'unknown',
        eventId,
        JSON.stringify(event),
        true,
      ]
    );

    console.log('LemonSqueezy webhook processed:', event.meta?.event_name);

    res.json({ received: true });
  } catch (error) {
    console.error('LemonSqueezy webhook error:', error);
    res.status(400).json({
      error: 'Webhook handler failed',
      details: String(error)
    });
  }
});

export default router;
