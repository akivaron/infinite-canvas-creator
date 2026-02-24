import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaddleTransactionRequest {
  priceId: string;
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
    const paddleApiKey = Deno.env.get("PADDLE_API_KEY");
    const paddleEnvironment = Deno.env.get("PADDLE_ENVIRONMENT") || "sandbox";

    if (!paddleApiKey) {
      return new Response(
        JSON.stringify({
          error: "Paddle not configured. Please add PADDLE_API_KEY to environment variables."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: PaddleTransactionRequest = await req.json();
    const {
      priceId,
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

    const paddleApiUrl = paddleEnvironment === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    const transactionData = {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      custom_data: {
        project_id: projectId || "",
        ...metadata,
      },
      billing_details: customerName ? {
        name: customerName,
      } : undefined,
    };

    const transactionResponse = await fetch(`${paddleApiUrl}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    if (!transactionResponse.ok) {
      const errorData = await transactionResponse.json();
      console.error("Paddle API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to create Paddle transaction",
          details: errorData,
        }),
        {
          status: transactionResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transaction = await transactionResponse.json();
    const transactionId = transaction.data.id;
    const checkoutUrl = transaction.data.checkout?.url;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbPaymentIntent, error: dbError } = await supabase
      .from("payment_intents")
      .insert({
        project_id: projectId || null,
        stripe_payment_intent_id: transactionId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        description: description,
        metadata: {
          ...metadata,
          provider: "paddle",
          price_id: priceId,
          transaction_id: transactionId,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({
        transactionId: transactionId,
        checkoutUrl: checkoutUrl,
        amount: amount,
        currency: currency.toUpperCase(),
        status: transaction.data.status,
        dbId: dbPaymentIntent?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Paddle transaction creation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create Paddle transaction",
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
