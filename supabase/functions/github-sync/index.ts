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

    const { user_id } = await req.json();

    const { data: tokenRow } = await supabase
      .from("user_tokens")
      .select("github_token, github_username")
      .eq("user_id", user_id)
      .single();

    if (!tokenRow?.github_token) {
      throw new Error("No GitHub token found");
    }

    const token = tokenRow.github_token;

    // Fetch repos
    const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    const repos = await reposRes.json();

    // Fetch commit history (last 30 days)
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const commitsRes = await fetch(
      `https://api.github.com/search/commits?q=author:${tokenRow.github_username}+committer-date:>${since}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.cloak-preview+json",
        },
      }
    );
    const commitsData = await commitsRes.json();

    // Fetch language stats from top repo
    let languages: Record<string, number> = {};
    if (repos.length > 0) {
      const langRes = await fetch(repos[0].languages_url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      languages = await langRes.json();
    }

    // Process into coding events
    const commitEvents = (commitsData.items || []).map((c: any) => ({
      user_id,
      event_type: "commit",
      repo_name: c.repository?.name,
      language: Object.keys(languages)[0] || null,
      xp_value: 50,
      metadata: { sha: c.sha, message: c.commit?.message?.slice(0, 100) },
    }));

    // Batch insert
    if (commitEvents.length > 0) {
      await supabase.from("coding_events").insert(commitEvents);
    }

    // Update last synced
    await supabase.from("user_tokens").update({ last_synced_at: new Date().toISOString() }).eq("user_id", user_id);

    return new Response(JSON.stringify({
      success: true,
      repos_synced: repos.length,
      commits_imported: commitEvents.length,
      languages,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
