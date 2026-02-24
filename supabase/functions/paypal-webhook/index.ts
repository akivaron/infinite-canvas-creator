import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log("Event already processed:", event.id);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let paymentIntentId: string | null = null;
    let status = "pending";

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      paymentIntentId = event.resource?.id;
      status = "processing";
    } else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      paymentIntentId = event.resource?.supplementary_data?.related_ids?.order_id;
      status = "succeeded";
    } else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
      paymentIntentId = event.resource?.supplementary_data?.related_ids?.order_id;
      status = "failed";
    }

    let dbPaymentIntent = null;

    if (paymentIntentId) {
      const { data } = await supabase
        .from("payment_intents")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (data) {
        dbPaymentIntent = data;
        await supabase
          .from("payment_intents")
          .update({ status })
          .eq("id", data.id);
      }
    }

    await supabase.from("payment_events").insert({
      payment_intent_id: dbPaymentIntent?.id || null,
      event_type: event.event_type,
      stripe_event_id: event.id,
      payload: event,
      processed: true,
    });

    console.log("PayPal webhook processed:", event.event_type);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook handler failed", details: String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
