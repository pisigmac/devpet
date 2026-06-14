import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CodingEvent {
  user_id: string;
  event_type: string;
  language?: string;
  xp_value: number;
  metadata?: Record<string, unknown>;
}

const XP_TABLE: Record<string, number> = {
  keystroke: 1,
  save: 10,
  commit: 50,
  language_switch: 5,
  session_start: 0,
  session_end: 25,
  pr_open: 100,
  pr_merge: 200,
};

const STAGE_THRESHOLDS = [0, 500, 2000, 8000, 25000];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event } = await req.json() as { event: CodingEvent };

    // Calculate base XP
    let xp = XP_TABLE[event.event_type] || 0;

    // Language diversity bonus (max 2x)
    const { data: recentLangs } = await supabase
      .from("coding_events")
      .select("language")
      .eq("user_id", event.user_id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .not("language", "is", null);

    const uniqueLangs = new Set(recentLangs?.map(e => e.language) || []);
    if (event.language && !uniqueLangs.has(event.language)) {
      xp = Math.floor(xp * 1.5);
    }

    // Streak bonus
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, pet_xp, pet_stage")
      .eq("id", event.user_id)
      .single();

    if (profile) {
      const streakBonus = Math.min(profile.current_streak * 0.1, 1.0); // max 2x total
      xp = Math.floor(xp * (1 + streakBonus));

      // Update XP
      const newXp = profile.pet_xp + xp;
      let newStage = profile.pet_stage;

      for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
        if (newXp >= STAGE_THRESHOLDS[i]) {
          newStage = i;
          break;
        }
      }

      const updates: Record<string, unknown> = {
        pet_xp: newXp,
        updated_at: new Date().toISOString(),
      };

      if (newStage !== profile.pet_stage) {
        updates.pet_stage = newStage;
        // Notify via realtime (handled by DB trigger ideally)
      }

      await supabase.from("profiles").update(updates).eq("id", event.user_id);

      // Insert event with calculated XP
      await supabase.from("coding_events").insert({
        ...event,
        xp_value: xp,
      });

      // Update daily snapshot
      const today = new Date().toISOString().split("T")[0];
      const { data: snapshot } = await supabase
        .from("daily_snapshots")
        .select("*")
        .eq("user_id", event.user_id)
        .eq("date", today)
        .single();

      if (snapshot) {
        const langs = new Set(snapshot.languages || []);
        if (event.language) langs.add(event.language);
        await supabase.from("daily_snapshots").update({
          total_xp: snapshot.total_xp + xp,
          total_commits: event.event_type === "commit" ? snapshot.total_commits + 1 : snapshot.total_commits,
          languages: Array.from(langs),
        }).eq("id", snapshot.id);
      } else {
        await supabase.from("daily_snapshots").insert({
          user_id: event.user_id,
          date: today,
          total_xp: xp,
          total_commits: event.event_type === "commit" ? 1 : 0,
          languages: event.language ? [event.language] : [],
        });
      }
    }

    return new Response(JSON.stringify({ success: true, xp_added: xp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
