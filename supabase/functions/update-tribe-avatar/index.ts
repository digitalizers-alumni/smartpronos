import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  AVATAR_BUCKET,
  avatarPath,
  corsHeaders,
  errorMessage,
  getAuthContext,
  jsonResponse,
  removeAvatar,
  validateImageFile,
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
    const formData = await req.formData();
    const tribeId = String(formData.get("tribeId") ?? "").trim();
    const file = formData.get("file");
    const imageFile = file instanceof File ? file : null;
    const extension = validateImageFile(imageFile);

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
      return jsonResponse({ success: false, message: "La photo d'une tribu pays ne peut pas être modifiée." }, 403);
    }

    const nextPath = avatarPath("tribes", tribeId, extension);
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(nextPath, imageFile as File, {
        contentType: imageFile!.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    let updateQuery = supabase
      .from("companies")
      .update({ avatar_path: nextPath })
      .eq("id", tribeId)
      .select("avatar_path");
    updateQuery = tribe.avatar_path
      ? updateQuery.eq("avatar_path", tribe.avatar_path)
      : updateQuery.is("avatar_path", null);

    const { data: updatedTribe, error: updateError } = await updateQuery.maybeSingle();
    if (updateError) {
      await removeAvatar(supabase, nextPath);
      throw updateError;
    }
    if (!updatedTribe) {
      await removeAvatar(supabase, nextPath);
      return jsonResponse({
        success: false,
        message: "La photo de tribu a été modifiée entre-temps. Réessaie.",
      }, 409);
    }

    await removeAvatar(supabase, tribe.avatar_path);

    return jsonResponse({
      success: true,
      avatar_path: nextPath,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[update-tribe-avatar] Erreur inattendue.", err);
    return jsonResponse({
      success: false,
      message: errorMessage(err, "Upload impossible."),
    }, 400);
  }
});
