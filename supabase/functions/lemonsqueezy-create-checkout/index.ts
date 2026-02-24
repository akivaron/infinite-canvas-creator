import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LemonSqueezyCheckoutRequest {
  variantId: string;
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
    const lemonSqueezyApiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    const lemonSqueezyStoreId = Deno.env.get("LEMONSQUEEZY_STORE_ID");

    if (!lemonSqueezyApiKey || !lemonSqueezyStoreId) {
      return new Response(
        JSON.stringify({
          error: "LemonSqueezy not configured. Please add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID to environment variables."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: LemonSqueezyCheckoutRequest = await req.json();
    const {
      variantId,
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

    const checkoutData = {
      data: {
        type: "checkouts",
        attributes: {
          store_id: parseInt(lemonSqueezyStoreId),
          variant_id: parseInt(variantId),
          custom_price: amount,
          checkout_data: {
            email: customerEmail || "",
            name: customerName || "",
            custom: {
              project_id: projectId || "",
              ...metadata,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: lemonSqueezyStoreId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    };

    const checkoutResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lemonSqueezyApiKey}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
      },
      body: JSON.stringify(checkoutData),
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error("LemonSqueezy API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to create LemonSqueezy checkout",
          details: errorData,
        }),
        {
          status: checkoutResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const checkout = await checkoutResponse.json();
    const checkoutId = checkout.data.id;
    const checkoutUrl = checkout.data.attributes.url;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbPaymentIntent, error: dbError } = await supabase
      .from("payment_intents")
      .insert({
        project_id: projectId || null,
        stripe_payment_intent_id: checkoutId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        description: description,
        metadata: {
          ...metadata,
          provider: "lemonsqueezy",
          variant_id: variantId,
          checkout_id: checkoutId,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({
        checkoutId: checkoutId,
        checkoutUrl: checkoutUrl,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
        dbId: dbPaymentIntent?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("LemonSqueezy checkout creation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create LemonSqueezy checkout",
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
