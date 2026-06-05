import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  corsHeaders,
  errorMessage,
  getAuthContext,
  jsonResponse,
  removeAvatar,
} from "../_shared/avatar.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Méthode non autorisée." }, 405);
  }

  try {
    const { supabase, userId } = await getAuthContext(req);
    const body = await req.json().catch(() => ({}));
    const tribeId = String(body?.tribeId ?? "").trim();
    if (!tribeId) {
      return jsonResponse({ success: false, message: "Tribu manquante." }, 400);
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("company_id", tribeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) {
      return jsonResponse({ success: false, message: "Tu n'es pas membre de cette tribu." }, 403);
    }

    const { data: tribe, error: tribeError } = await supabase
      .from("companies")
      .select("avatar_path, country_team_id")
      .eq("id", tribeId)
      .single();
    if (tribeError) throw tribeError;
    if (tribe.country_team_id) {
      return jsonResponse({ success: false, message: "La photo d'une tribu pays ne peut pas être supprimée." }, 403);
    }

    const oldPath = tribe.avatar_path ?? null;
    if (!oldPath) {
      return jsonResponse({ success: true, avatar_path: null });
    }

    const { data: updatedTribe, error: updateError } = await supabase
      .from("companies")
      .update({ avatar_path: null })
      .eq("id", tribeId)
      .eq("avatar_path", oldPath)
      .select("avatar_path")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedTribe) {
      return jsonResponse({
        success: false,
        message: "La photo de tribu a été modifiée entre-temps. Réessaie.",
      }, 409);
    }

    await removeAvatar(supabase, oldPath);

    return jsonResponse({ success: true, avatar_path: null });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[delete-tribe-avatar] Erreur inattendue.", err);
    return jsonResponse({
      success: false,
      message: errorMessage(err, "Suppression impossible."),
    }, 400);
  }
});
