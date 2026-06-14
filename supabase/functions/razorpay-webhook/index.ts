import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

async function verifyWebhook(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = encoder.encode(signature);
  const data = encoder.encode(body);
  return await crypto.subtle.verify("HMAC", key, sig, data);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  const isValid = await verifyWebhook(body, signature);
  if (!isValid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(body);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.event === "order.paid" || event.event === "payment.captured") {
    const payment = event.payload.payment?.entity || event.payload.order?.entity;
    const orderId = payment.order_id || event.payload.order?.entity?.id;

    if (!orderId) return new Response("No order ID", { status: 400 });

    const { data: order } = await supabase
      .from("razorpay_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order) return new Response("Order not found", { status: 404 });

    await supabase.from("razorpay_payments").insert({
      id: payment.id,
      order_id: orderId,
      user_id: order.user_id,
      amount: payment.amount,
      status: "captured",
      method: payment.method,
      captured_at: new Date().toISOString(),
    });

    await supabase.from("razorpay_orders").update({ status: "paid" }).eq("id", orderId);

    await supabase.from("user_inventory").insert({
      user_id: order.user_id,
      product_id: order.product_id,
      price_id: order.price_id,
    });

    const { data: product } = await supabase
      .from("products")
      .select("category")
      .eq("id", order.product_id)
      .single();

    if (product?.category === "subscription") {
      await supabase.from("profiles").update({ is_premium: true }).eq("id", order.user_id);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
