// US-DA-007 — Edge Function : sync des scores depuis football-data.org
// Écrit dans match_results (UPSERT par match_id). Le status est calculé
// dynamiquement par la vue matches_with_status.
// Déploiement : voir supabase/functions/update-scores/README.md

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FD_API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const SEASON = 2026;
const SYNC_STATE_KEY = "update-scores";
const ACTIVE_SYNC_INTERVAL_MS = 60 * 1000;
const IDLE_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const MATCH_WINDOW_BEFORE_MS = 15 * 60 * 1000;
const MATCH_WINDOW_AFTER_MS = 210 * 60 * 1000;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "onboarding@resend.dev";

function mapStage(stage: string | null | undefined, group: string | null | undefined): string {
  const normalized = (stage ?? "").toUpperCase();
  if (normalized.includes("GROUP") || group) return "group";
  if (normalized.includes("LAST_32") || normalized.includes("ROUND_OF_32")) return "round_of_32";
  if (normalized.includes("LAST_16") || normalized.includes("ROUND_OF_16")) return "round_of_16";
  if (normalized.includes("QUARTER")) return "quarter_final";
  if (normalized.includes("SEMI")) return "semi_final";
  if (normalized.includes("THIRD")) return "third_place";
  if (normalized.includes("FINAL")) return "final";
  return "group";
}

function mapGroup(group: string | null | undefined): string | null {
  if (!group) return null;
  return group.replace(/^GROUP[_\s-]*/i, "").trim() || null;
}

function teamLookupKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

async function shouldFetchFootballData(supabase: ReturnType<typeof createClient>, now: Date) {
  try {
    const { data: state } = await supabase
      .from("football_data_sync_state")
      .select("last_football_data_fetch_at")
      .eq("key", SYNC_STATE_KEY)
      .maybeSingle();

    const windowStart = new Date(now.getTime() - MATCH_WINDOW_AFTER_MS).toISOString();
    const windowEnd = new Date(now.getTime() + MATCH_WINDOW_BEFORE_MS).toISOString();
    const { data: candidateMatches } = await supabase
      .from("matches")
      .select("id")
      .gte("kickoff_at", windowStart)
      .lte("kickoff_at", windowEnd);

    let activeWindow = false;
    const candidateIds = (candidateMatches ?? []).map((match) => match.id);
    if (candidateIds.length > 0) {
      const { data: existingResults } = await supabase
        .from("match_results")
        .select("match_id")
        .in("match_id", candidateIds);
      const resultIds = new Set((existingResults ?? []).map((result) => result.match_id));
      activeWindow = candidateIds.some((matchId) => !resultIds.has(matchId));
    }

    const intervalMs = activeWindow ? ACTIVE_SYNC_INTERVAL_MS : IDLE_SYNC_INTERVAL_MS;
    const lastFetchAt = state?.last_football_data_fetch_at
      ? new Date(state.last_football_data_fetch_at).getTime()
      : 0;

    return {
      shouldFetch: !lastFetchAt || now.getTime() - lastFetchAt >= intervalMs,
      activeWindow,
      intervalSeconds: Math.round(intervalMs / 1000),
      lastFetchAt: state?.last_football_data_fetch_at ?? null,
    };
  } catch (error) {
    console.warn("Sync throttle unavailable, fetching anyway", error);
    return {
      shouldFetch: true,
      activeWindow: true,
      intervalSeconds: Math.round(ACTIVE_SYNC_INTERVAL_MS / 1000),
      lastFetchAt: null,
    };
  }
}

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

    // 1. Connexion Supabase + garde de fréquence.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const nowDate = new Date();
    const syncDecision = await shouldFetchFootballData(supabase, nowDate);
    if (!syncDecision.shouldFetch) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "throttled",
          active_window: syncDecision.activeWindow,
          min_interval_seconds: syncDecision.intervalSeconds,
          last_football_data_fetch_at: syncDecision.lastFetchAt,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 2. Fetch matches depuis football-data.org
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

    // 3. Charger les équipes et aliases externes (name → id)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsError) {
      return new Response(
        JSON.stringify({ error: "supabase teams fetch error", details: teamsError }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const { data: teamMappings, error: mappingsError } = await supabase
      .from("team_external_mappings")
      .select("external_name, team_id")
      .eq("provider", "football-data");

    if (mappingsError) {
      return new Response(
        JSON.stringify({ error: "supabase team mappings fetch error", details: mappingsError }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const teamIdByName = new Map<string, string>();
    for (const t of teams ?? []) {
      teamIdByName.set(t.name, t.id);
      teamIdByName.set(teamLookupKey(t.name), t.id);
    }
    for (const mapping of teamMappings ?? []) {
      teamIdByName.set(teamLookupKey(mapping.external_name), mapping.team_id);
    }

    // 4. Charger les matches (pour mapper football-data id ou home/away → match_id)
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, kickoff_at, football_data_match_id");

    if (matchesError) {
      return new Response(
        JSON.stringify({ error: "supabase matches fetch error", details: matchesError }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const matchIdByFootballDataId = new Map<number, string>();
    const matchIdByPair = new Map<string, string>();
    for (const m of matches ?? []) {
      if (m.football_data_match_id != null) {
        matchIdByFootballDataId.set(Number(m.football_data_match_id), m.id);
      }
      matchIdByPair.set(`${m.home_team_id}|${m.away_team_id}`, m.id);
    }

    // 5. Upsert des matches football-data dont les deux équipes sont connues.
    const now = new Date().toISOString();
    let matchesInserted = 0;
    let matchesUpdated = 0;
    let skippedTbd = 0;
    let skippedIncomplete = 0;
    let skippedTeamsUnmapped = 0;
    const errors: string[] = [];

    for (const m of fdMatches) {
      const homeName = m.homeTeam?.name;
      const awayName = m.awayTeam?.name;
      const homeId = teamIdByName.get(teamLookupKey(homeName));
      const awayId = teamIdByName.get(teamLookupKey(awayName));

      if (!homeName || !awayName || homeName === "TBD" || awayName === "TBD") {
        skippedTbd++;
        continue;
      }

      if (!m.id || !m.utcDate) {
        skippedIncomplete++;
        errors.push(`Incomplete match payload: ${homeName} vs ${awayName}`);
        continue;
      }

      if (!homeId || !awayId) {
        skippedTeamsUnmapped++;
        errors.push(`Unmapped teams: ${homeName} vs ${awayName}`);
        continue;
      }

      const footballDataId = Number(m.id);
      const pairKey = `${homeId}|${awayId}`;
      const existingMatchId = matchIdByFootballDataId.get(footballDataId) ?? matchIdByPair.get(pairKey);
      const matchPayload = {
        football_data_match_id: Number.isFinite(footballDataId) ? footballDataId : null,
        football_data_matchday: m.matchday ?? null,
        football_data_last_synced_at: now,
        home_team_id: homeId,
        away_team_id: awayId,
        kickoff_at: m.utcDate,
        stage: mapStage(m.stage, m.group),
        group_name: mapGroup(m.group),
        venue_stadium: m.venue ?? null,
      };

      if (existingMatchId) {
        const { error: updateError } = await supabase
          .from("matches")
          .update(matchPayload)
          .eq("id", existingMatchId);

        if (updateError) {
          errors.push(`Match update error ${homeName}-${awayName}: ${updateError.message}`);
          continue;
        }
        matchesUpdated++;
        matchIdByFootballDataId.set(footballDataId, existingMatchId);
        matchIdByPair.set(pairKey, existingMatchId);
      } else {
        const { data: insertedMatch, error: insertError } = await supabase
          .from("matches")
          .insert(matchPayload)
          .select("id")
          .single();

        if (insertError || !insertedMatch) {
          errors.push(`Match insert error ${homeName}-${awayName}: ${insertError?.message ?? "missing inserted row"}`);
          continue;
        }
        matchesInserted++;
        matchIdByFootballDataId.set(footballDataId, insertedMatch.id);
        matchIdByPair.set(pairKey, insertedMatch.id);
      }
    }

    // 6. Pour chaque match football-data.org FINISHED → upsert match_results
    let resultsUpserted = 0;
    let skippedNotFinished = 0;
    let skippedResultUnmapped = 0;

    for (const m of fdMatches) {
      // On ne stocke un résultat que si le match est terminé
      if (m.status !== "FINISHED") {
        skippedNotFinished++;
        continue;
      }

      const homeName = m.homeTeam?.name;
      const awayName = m.awayTeam?.name;
      const homeId = teamIdByName.get(teamLookupKey(homeName));
      const awayId = teamIdByName.get(teamLookupKey(awayName));

      if (!homeId || !awayId) {
        skippedResultUnmapped++;
        errors.push(`Unmapped teams: ${homeName} vs ${awayName}`);
        continue;
      }

      const footballDataId = Number(m.id);
      const matchId =
        matchIdByFootballDataId.get(footballDataId) ??
        matchIdByPair.get(`${homeId}|${awayId}`);
      if (!matchId) {
        skippedResultUnmapped++;
        errors.push(`No match in DB for ${homeName} vs ${awayName}`);
        continue;
      }

      let homeScore = m.score?.fullTime?.home;
      let awayScore = m.score?.fullTime?.away;

      // Si le match s'est terminé aux tirs au but, on exclut les tirs au but pour obtenir le score à la fin des prolongations (120 min)
      if (m.score?.duration === "PENALTY_SHOOTOUT") {
        const regHome = m.score?.regularTime?.home ?? 0;
        const regAway = m.score?.regularTime?.away ?? 0;
        const extHome = m.score?.extraTime?.home ?? 0;
        const extAway = m.score?.extraTime?.away ?? 0;
        homeScore = regHome + extHome;
        awayScore = regAway + extAway;
      }

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
      resultsUpserted++;
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

    const responseBody = {
      ok: true,
      synced_at: now,
      fd_matches_received: fdMatches.length,
      matches_inserted: matchesInserted,
      matches_updated: matchesUpdated,
      skipped_tbd: skippedTbd,
      skipped_incomplete: skippedIncomplete,
      skipped_teams_unmapped: skippedTeamsUnmapped,
      results_upserted: resultsUpserted,
      skipped_not_finished: skippedNotFinished,
      skipped_result_unmapped: skippedResultUnmapped,
      active_window: syncDecision.activeWindow,
      min_interval_seconds: syncDecision.intervalSeconds,
      errors: errors.slice(0, 10),
      alerts_candidates: alertsCandidates,
      alerts_sent: alertsSent,
      alerts_failed: alertsFailed,
      alerts_skipped_no_config: alertsSkippedNoConfig,
      alert_errors: alertErrors,
    };

    const { error: stateError } = await supabase
      .from("football_data_sync_state")
      .upsert(
        {
          key: SYNC_STATE_KEY,
          last_football_data_fetch_at: now,
          last_success_at: now,
          last_response: responseBody,
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (stateError) {
      console.warn("Could not persist football-data sync state", stateError);
    }

    return new Response(
      JSON.stringify(responseBody),
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
