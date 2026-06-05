import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../core/services/supabase.service';

interface AvatarFunctionResponse {
  success?: boolean;
  avatar_path?: string | null;
  message?: string;
}

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly supabase = inject(SupabaseService);

  getPublicUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return this.supabase.client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async updateProfileAvatar(file: File): Promise<string | null> {
    this.validateAvatarFile(file);
    const formData = new FormData();
    formData.append('file', file);
    return this.invokeAvatarFunction('update-profile-avatar', formData);
  }

  async deleteProfileAvatar(): Promise<void> {
    await this.invokeAvatarFunction('delete-profile-avatar', {});
  }

  async updateTribeAvatar(tribeId: string, file: File): Promise<string | null> {
    this.validateAvatarFile(file);
    const formData = new FormData();
    formData.append('tribeId', tribeId);
    formData.append('file', file);
    return this.invokeAvatarFunction('update-tribe-avatar', formData);
  }

  async deleteTribeAvatar(tribeId: string): Promise<void> {
    await this.invokeAvatarFunction('delete-tribe-avatar', { tribeId });
  }

  private validateAvatarFile(file: File): void {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      throw new Error('Format invalide. Utilise une image JPEG, PNG ou WebP.');
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error('Image trop lourde. Taille maximum : 5 Mo.');
    }
  }

  private async invokeAvatarFunction(
    functionName: string,
    body: FormData | Record<string, unknown>,
  ): Promise<string | null> {
    const { data, error } = await this.supabase.client.functions.invoke(functionName, {
      body,
    });
    if (error) {
      throw new Error(await this.functionErrorMessage(error));
    }

    const result = data as AvatarFunctionResponse | null;
    if (!result?.success) {
      throw new Error(result?.message ?? 'Action photo impossible.');
    }
    return result.avatar_path ?? null;
  }

  private async functionErrorMessage(error: unknown): Promise<string> {
    const context = (error as { context?: Response }).context;
    if (context) {
      const text = await context.clone().text().catch(() => '');
      if (text) {
        try {
          const payload = JSON.parse(text) as AvatarFunctionResponse;
          if (payload.message) return payload.message;
        } catch {
          return text;
        }
      }
    }
    return error instanceof Error ? error.message : 'Action photo impossible.';
  }
}
