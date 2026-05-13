// US-DA-007 — Edge Function : sync des scores depuis football-data.org
// Écrit dans match_results (UPSERT par match_id). Le status est calculé
// dynamiquement par la vue matches_with_status.
// Déploiement : voir supabase/functions/update-scores/README.md

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FD_API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const SEASON = 2026;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "onboarding@resend.dev";

async function sendAlertEmail(
  match: {
    match_id: string;
    kickoff_at: string;
    home_name: string;
    home_name_fr: string;
    away_name: string;
    away_name_fr: string;
  },
  resendKey: string,
  to: string[],
  from: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = `[SmartPronos] Match en retard : ${match.home_name_fr} vs ${match.away_name_fr}`;
  const text = [
    "Alerte automatique — Pipeline de scores",
    "",
    `Match : ${match.home_name_fr} (${match.home_name}) vs ${match.away_name_fr} (${match.away_name})`,
    `Kickoff : ${match.kickoff_at}`,
    "Statut : aucun score ingéré 180 min après le coup d'envoi.",
    "",
    "Action requise (procédure de fallback, cf. DATA/strategy.md) :",
    "  1. Vérifier le score sur fifa.com",
    "  2. Demander à la team Backend d'insérer le score via Supabase Studio",
    "  3. L'alerte ne sera pas renvoyée pour ce match (PK match_alerts)",
    "",
    "--",
    "Edge Function update-scores",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

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

    // ===== Détection des matchs en retard + alerte e-mail =====
    let alertsCandidates = 0;
    let alertsSent = 0;
    let alertsFailed = 0;
    let alertsSkippedNoConfig = false;
    const alertErrors: Array<{ match_id: string; error: string }> = [];

    if (!RESEND_API_KEY || !ALERT_EMAIL_TO) {
      console.warn(
        "RESEND_API_KEY ou ALERT_EMAIL_TO manquante : section alertes désactivée"
      );
      alertsSkippedNoConfig = true;
    } else {
      const cutoff = new Date(Date.now() - 180 * 60 * 1000).toISOString();

      // Charger les données en flat queries (style cohérent avec le sync existant)
      const { data: lateMatches, error: amErr } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, kickoff_at")
        .lt("kickoff_at", cutoff);

      const { data: teamsForAlert, error: tErr } = await supabase
        .from("teams")
        .select("id, name, name_fr");

      const { data: existingResults, error: rErr } = await supabase
        .from("match_results")
        .select("match_id");

      const { data: existingAlerts, error: aErr } = await supabase
        .from("match_alerts")
        .select("match_id");

      if (amErr || tErr || rErr || aErr) {
        alertErrors.push({
          match_id: "(query)",
          error: `alert queries failed: ${JSON.stringify({ amErr, tErr, rErr, aErr })}`,
        });
      } else {
        // Maps pour jointures en mémoire
        const teamById = new Map<string, { name: string; name_fr: string }>();
        for (const t of teamsForAlert ?? []) {
          teamById.set(t.id, { name: t.name, name_fr: t.name_fr });
        }
        const resultMatchIds = new Set((existingResults ?? []).map((r) => r.match_id));
        const alertMatchIds = new Set((existingAlerts ?? []).map((a) => a.match_id));

        // Matchs candidats : en retard ET pas de score ET pas d'alerte
        const toAlert = (lateMatches ?? []).filter(
          (m) => !resultMatchIds.has(m.id) && !alertMatchIds.has(m.id)
        );

        alertsCandidates = toAlert.length;

        const to = ALERT_EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean);

        for (const m of toAlert) {
          const home = teamById.get(m.home_team_id);
          const away = teamById.get(m.away_team_id);
          const result = await sendAlertEmail(
            {
              match_id: m.id,
              kickoff_at: m.kickoff_at,
              home_name: home?.name ?? "?",
              home_name_fr: home?.name_fr ?? "?",
              away_name: away?.name ?? "?",
              away_name_fr: away?.name_fr ?? "?",
            },
            RESEND_API_KEY,
            to,
            ALERT_EMAIL_FROM
          );
          if (result.ok) {
            const { error: insertError } = await supabase
              .from("match_alerts")
              .insert({ match_id: m.id });
            if (insertError && !String(insertError.message).includes("duplicate key")) {
              alertsFailed++;
              alertErrors.push({ match_id: m.id, error: String(insertError.message) });
            } else {
              alertsSent++;
            }
          } else {
            alertsFailed++;
            alertErrors.push({ match_id: m.id, error: result.error ?? "unknown" });
          }
        }
      }
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
        alerts_candidates: alertsCandidates,
        alerts_sent: alertsSent,
        alerts_failed: alertsFailed,
        alerts_skipped_no_config: alertsSkippedNoConfig,
        alert_errors: alertErrors,
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
