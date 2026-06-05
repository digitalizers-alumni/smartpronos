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
    const file = formData.get("file");
    const imageFile = file instanceof File ? file : null;
    const extension = validateImageFile(imageFile);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;

    const nextPath = avatarPath("profiles", userId, extension);
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(nextPath, imageFile as File, {
        contentType: imageFile!.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    let updateQuery = supabase
      .from("profiles")
      .update({ avatar_path: nextPath })
      .eq("id", userId)
      .select("avatar_path");
    updateQuery = profile?.avatar_path
      ? updateQuery.eq("avatar_path", profile.avatar_path)
      : updateQuery.is("avatar_path", null);

    const { data: updatedProfile, error: updateError } = await updateQuery.maybeSingle();
    if (updateError) {
      await removeAvatar(supabase, nextPath);
      throw updateError;
    }
    if (!updatedProfile) {
      await removeAvatar(supabase, nextPath);
      return jsonResponse({
        success: false,
        message: "La photo a été modifiée entre-temps. Réessaie.",
      }, 409);
    }

    await removeAvatar(supabase, profile?.avatar_path);

    return jsonResponse({
      success: true,
      avatar_path: nextPath,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[update-profile-avatar] Erreur inattendue.", err);
    return jsonResponse({
      success: false,
      message: errorMessage(err, "Upload impossible."),
    }, 400);
  }
});
