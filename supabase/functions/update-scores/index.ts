// US-DA-007 — Edge Function : sync des scores depuis football-data.org
// Écrit dans match_results (UPSERT par match_id). Le status est calculé
// dynamiquement par la vue matches_with_status.
// Déploiement : voir supabase/functions/update-scores/README.md

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FD_API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const SEASON = 2026;

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, content-type",
        },
      });
    }

    const FD_KEY = Deno.env.get("FOOTBALL_DATA_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FD_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing env vars (FOOTBALL_DATA_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // 1. Fetch matches depuis football-data.org
    const fdResponse = await fetch(
      `${FD_API_BASE}/competitions/${COMPETITION}/matches?season=${SEASON}`,
      { headers: { "X-Auth-Token": FD_KEY } }
    );

    if (!fdResponse.ok) {
      const errText = await fdResponse.text();
      return new Response(
        JSON.stringify({
          error: "football-data.org error",
          status: fdResponse.status,
          body: errText,
        }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const fdData = await fdResponse.json();
    const fdMatches = fdData.matches ?? [];

    // 2. Connexion Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Charger les équipes (name → id)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsError) {
      return new Response(
        JSON.stringify({ error: "supabase teams fetch error", details: teamsError }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const teamIdByName = new Map<string, string>();
    for (const t of teams ?? []) teamIdByName.set(t.name, t.id);

    // 4. Charger les matches (pour mapper home/away/kickoff → match_id)
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, kickoff_at");

    if (matchesError) {
      return new Response(
        JSON.stringify({ error: "supabase matches fetch error", details: matchesError }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // Index : "<homeId>|<awayId>" → matchId (suffisant pour WC, pas de doublon)
    const matchIdByPair = new Map<string, string>();
    for (const m of matches ?? []) {
      matchIdByPair.set(`${m.home_team_id}|${m.away_team_id}`, m.id);
    }

    // 5. Pour chaque match football-data.org FINISHED → upsert match_results
    const now = new Date().toISOString();
    let upserted = 0;
    let skippedNotFinished = 0;
    let skippedUnmapped = 0;
    const errors: string[] = [];

    for (const m of fdMatches) {
      // On ne stocke un résultat que si le match est terminé
      if (m.status !== "FINISHED") {
        skippedNotFinished++;
        continue;
      }

      const homeName = m.homeTeam?.name;
      const awayName = m.awayTeam?.name;
      const homeId = teamIdByName.get(homeName);
      const awayId = teamIdByName.get(awayName);

      if (!homeId || !awayId) {
        skippedUnmapped++;
        errors.push(`Unmapped teams: ${homeName} vs ${awayName}`);
        continue;
      }

      const matchId = matchIdByPair.get(`${homeId}|${awayId}`);
      if (!matchId) {
        skippedUnmapped++;
        errors.push(`No match in DB for ${homeName} vs ${awayName}`);
        continue;
      }

      const homeScore = m.score?.fullTime?.home;
      const awayScore = m.score?.fullTime?.away;
      if (homeScore == null || awayScore == null) {
        errors.push(`Missing score for ${homeName} vs ${awayName}`);
        continue;
      }

      const { error: upsertError } = await supabase
        .from("match_results")
        .upsert(
          {
            match_id: matchId,
            home_score: homeScore,
            away_score: awayScore,
            updated_at: now,
            last_synced_at: now,
          },
          { onConflict: "match_id" }
        );

      if (upsertError) {
        errors.push(`Upsert error ${homeName}-${awayName}: ${upsertError.message}`);
        continue;
      }
      upserted++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        synced_at: now,
        fd_matches_received: fdMatches.length,
        results_upserted: upserted,
        skipped_not_finished: skippedNotFinished,
        skipped_unmapped: skippedUnmapped,
        errors: errors.slice(0, 10),
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "unexpected", message: String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
