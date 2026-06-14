import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { price_id, product_id } = await req.json();
    const authHeader = req.headers.get("authorization")!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: price } = await supabase.from("prices").select("*").eq("id", price_id).single();
    if (!price) throw new Error("Price not found");

    const amount = price.unit_amount * 100; // Convert to paise
    const receipt = `devpet_${user.id.slice(0, 8)}_${Date.now()}`;

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { user_id: user.id, product_id, price_id },
      }),
    });

    const order = await orderRes.json();
    if (!order.id) throw new Error(order.error?.description || "Order creation failed");

    await supabase.from("razorpay_orders").insert({
      id: order.id,
      user_id: user.id,
      product_id,
      price_id,
      amount,
      currency: "INR",
      receipt,
      metadata: { provider: "razorpay" },
    });

    return new Response(JSON.stringify({
      order_id: order.id,
      amount,
      currency: "INR",
      key_id: RAZORPAY_KEY_ID,
      user_id: user.id,
      product_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
