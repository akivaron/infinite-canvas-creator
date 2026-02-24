import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Paddle-Signature",
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

    const eventId = event.event_id || event.id;

    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log("Event already processed:", eventId);
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

    const eventType = event.event_type;

    if (eventType === "transaction.created") {
      paymentIntentId = event.data?.id;
      status = "processing";
    } else if (eventType === "transaction.completed") {
      paymentIntentId = event.data?.id;
      status = "succeeded";
    } else if (eventType === "transaction.payment_failed") {
      paymentIntentId = event.data?.id;
      status = "failed";
    } else if (eventType === "transaction.canceled") {
      paymentIntentId = event.data?.id;
      status = "canceled";
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
      event_type: eventType || "unknown",
      stripe_event_id: eventId,
      payload: event,
      processed: true,
    });

    console.log("Paddle webhook processed:", eventType);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook handler failed", details: String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
