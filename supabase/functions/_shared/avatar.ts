import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedTypes = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export interface AuthContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new Response("Session manquante.", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Response("Session invalide.", { status: 401, headers: corsHeaders });
  }

  return { supabase, userId: data.user.id };
}

export function validateImageFile(file: File | null): string {
  if (!file) {
    throw new Response("Image manquante.", { status: 400, headers: corsHeaders });
  }
  if (!allowedTypes.has(file.type)) {
    throw new Response("Format invalide. Utilise une image JPEG, PNG ou WebP.", {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Response("Image trop lourde. Taille maximum : 5 Mo.", {
      status: 400,
      headers: corsHeaders,
    });
  }
  return allowedTypes.get(file.type) as string;
}

export function avatarPath(kind: "profiles" | "tribes", ownerId: string, extension: string): string {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${kind}/${ownerId}/${crypto.randomUUID()}.${safeExtension}`;
}

export async function removeAvatar(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) {
    console.error("[avatar] Impossible de supprimer l'ancien avatar.", error);
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const candidate = err as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown };
    for (const value of [candidate.message, candidate.error, candidate.details, candidate.hint]) {
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}
