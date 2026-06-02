import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

export interface Team {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  name_fr: string | null;
  code: string;
  flag_url: string | null;
}

interface RpcJsonResponse<T> {
  success: boolean;
  error_code?: string;
  message?: string;
  data?: T;
}

export interface UserProfile {
  total_points: number;
  exact_count: number;
  total_predictions: number;
  rank: number | null;
  favorite_team_id: string | null;
  favorite_team_code: string | null;
  favorite_team_name: string | null;
  favorite_team_flag: string | null;
  username: string | null;
  display_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly supabase = inject(SupabaseService);

  getTeams(): Observable<Team[]> {
    return from(
      this.supabase.client
        .from('teams')
        .select('id, name, name_fr, code, flag_url')
        .order('name_fr'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return ((data ?? []) as TeamRow[]).map((team) => ({
          id: team.id,
          name: team.name_fr ?? team.name,
          code: team.code,
          flag_url: team.flag_url,
        }));
      }),
    );
  }

  setFavoriteTeam(teamId: string | null): Observable<void> {
    return from(
      this.supabase.client.rpc('set_favorite_team', { p_team_id: teamId }),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  getUserProfile(): Observable<UserProfile> {
    return from(
      this.supabase.client.rpc('get_user_profile'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as unknown as UserProfile;
      }),
    );
  }

  updateDisplayName(displayName: string): Observable<void> {
    return from(
      this.supabase.client.rpc('update_display_name', { p_display_name: displayName }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data as RpcJsonResponse<unknown> | null;
        if (!result?.success) {
          throw new Error(result?.message ?? 'Nom affiché impossible à mettre à jour.');
        }
      }),
    );
  }

  deleteMyAccount(): Observable<void> {
    return from(
      this.supabase.client.rpc('delete_my_account'),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }
}
