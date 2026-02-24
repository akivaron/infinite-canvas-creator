import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PayPalOrderRequest {
  amount: number;
  currency?: string;
  description?: string;
  projectId?: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_SECRET");
    const paypalMode = Deno.env.get("PAYPAL_MODE") || "sandbox";

    if (!paypalClientId || !paypalSecret) {
      return new Response(
        JSON.stringify({
          error: "PayPal not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_SECRET to environment variables."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: PayPalOrderRequest = await req.json();
    const {
      amount,
      currency = "USD",
      description = "Payment",
      projectId,
      customerEmail,
      customerName,
      metadata = {},
    } = requestData;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paypalApiUrl = paypalMode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${paypalClientId}:${paypalSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with PayPal");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: (amount / 100).toFixed(2),
          },
          description: description,
          custom_id: projectId || "",
        },
      ],
      application_context: {
        brand_name: "Your App",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${req.headers.get("origin") || ""}/payment/success`,
        cancel_url: `${req.headers.get("origin") || ""}/payment/cancel`,
      },
    };

    const orderResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error("PayPal API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to create PayPal order",
          details: errorData,
        }),
        {
          status: orderResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const order = await orderResponse.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbPaymentIntent, error: dbError } = await supabase
      .from("payment_intents")
      .insert({
        project_id: projectId || null,
        stripe_payment_intent_id: order.id,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        description: description,
        metadata: { ...metadata, provider: "paypal", paypal_order_id: order.id },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    const approveLink = order.links.find((link: any) => link.rel === "approve");

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approveUrl: approveLink?.href,
        amount: amount,
        currency: currency.toUpperCase(),
        status: order.status,
        dbId: dbPaymentIntent?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PayPal order creation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create PayPal order",
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
