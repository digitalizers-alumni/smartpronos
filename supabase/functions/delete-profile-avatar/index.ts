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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;

    const oldPath = profile?.avatar_path ?? null;
    if (!oldPath) {
      return jsonResponse({ success: true, avatar_path: null });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", userId)
      .eq("avatar_path", oldPath)
      .select("avatar_path")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedProfile) {
      return jsonResponse({
        success: false,
        message: "La photo a été modifiée entre-temps. Réessaie.",
      }, 409);
    }

    await removeAvatar(supabase, oldPath);

    return jsonResponse({ success: true, avatar_path: null });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[delete-profile-avatar] Erreur inattendue.", err);
    return jsonResponse({
      success: false,
      message: errorMessage(err, "Suppression impossible."),
    }, 400);
  }
});
