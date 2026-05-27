import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

export interface Team {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
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
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly supabase = inject(SupabaseService);

  getTeams(): Observable<Team[]> {
    return from(
      this.supabase.client
        .from('teams')
        .select('id, name, code, flag_url')
        .order('name'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as Team[];
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
