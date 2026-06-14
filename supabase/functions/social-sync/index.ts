import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, user_id, friend_code, friend_id } = await req.json();

    if (action === "invite") {
      // Generate friend code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabase.from("pet_friends").insert({
        requester_id: user_id,
        addressee_id: user_id, // placeholder, will be updated when claimed
        friend_code: code,
        status: "pending",
      });
      return new Response(JSON.stringify({ code }), { headers: corsHeaders });
    }

    if (action === "accept") {
      const { data: request } = await supabase
        .from("pet_friends")
        .select("*")
        .eq("friend_code", friend_code)
        .eq("status", "pending")
        .single();

      if (!request) throw new Error("Invalid or expired friend code");

      await supabase.from("pet_friends").update({
        addressee_id: user_id,
        status: "accepted",
      }).eq("id", request.id);

      // Create reciprocal entry
      await supabase.from("pet_friends").insert({
        requester_id: user_id,
        addressee_id: request.requester_id,
        status: "accepted",
      });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "leaderboard") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, pet_name, pet_stage, pet_xp, current_streak")
        .order("pet_xp", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ leaderboard: profiles }), { headers: corsHeaders });
    }

    if (action === "compare") {
      const { data: me } = await supabase.from("profiles").select("*").eq("id", user_id).single();
      const { data: them } = await supabase.from("profiles").select("*").eq("id", friend_id).single();

      return new Response(JSON.stringify({ me, them }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
