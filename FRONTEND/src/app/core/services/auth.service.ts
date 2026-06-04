import { Injectable, signal, computed, inject } from '@angular/core';
import { User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  async signUp(
    email: string,
    password: string,
    profile?: { firstName: string; lastName: string },
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: emailAvailable, error: emailAvailabilityError } =
      await this.supabase.client.rpc('email_is_available', {
        p_email: normalizedEmail,
      });

    if (emailAvailabilityError) throw emailAvailabilityError;
    if (!emailAvailable) {
      throw new Error('Un compte existe déjà avec cet email.');
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: profile
          ? {
            first_name: profile.firstName,
            last_name: profile.lastName,
            full_name: `${profile.firstName} ${profile.lastName}`.trim(),
          }
          : undefined,
      },
    });
    if (error) throw error;
    if (data?.session) {
      this.currentUser.set(data.session.user);
    }
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.session) {
      this.currentUser.set(data.session.user);
    }
    return data;
  }

  async restoreSession(): Promise<boolean> {
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session) {
      this.currentUser.set(data.session.user);
      return true;
    }
    return false;
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this.currentUser.set(null);
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/update-password` },
    );
    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
}
