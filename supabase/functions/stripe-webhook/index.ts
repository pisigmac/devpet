import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const priceId = session.line_items?.data[0]?.price?.id || session.metadata?.price_id;

      if (userId && priceId) {
        await supabase.from("user_inventory").insert({
          user_id: userId,
          product_id: session.metadata?.product_id,
          price_id: priceId,
        });

        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await supabase.from("subscriptions").insert({
            id: sub.id,
            user_id: userId,
            status: sub.status,
            price_id: priceId,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
          await supabase.from("profiles").update({ is_premium: true }).eq("id", userId);
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        await supabase.from("subscriptions").update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", sub.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from("subscriptions").update({
        status: "canceled",
        ended_at: new Date().toISOString(),
      }).eq("id", sub.id);

      const { data: activeSubs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", sub.metadata?.user_id)
        .in("status", ["trialing", "active"]);

      if (!activeSubs?.length) {
        await supabase.from("profiles").update({ is_premium: false }).eq("id", sub.metadata?.user_id);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
