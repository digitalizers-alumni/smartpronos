import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

export interface LeaderboardUserRow {
  rank: number | string;
  user_id: string;
  username: string | null;
  total_points: number | string;
  exact_count: number | string;
}

export interface TribesLeaderboardRow {
  rank: number | string;
  tribe_id: string;
  name: string;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
}

export interface CurrentUserTribe {
  tribe_id: string | null;
  tribe_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly supabase = inject(SupabaseService);

  getCurrentUserTribe(): Observable<CurrentUserTribe> {
    return from(
      this.supabase.client
        .from('current_user_tribe')
        .select('tribe_id, tribe_name')
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          tribe_id: data?.tribe_id ?? null,
          tribe_name: data?.tribe_name ?? null,
        };
      }),
    );
  }

  getGlobalLeaderboard(): Observable<LeaderboardUserRow[]> {
    return from(this.supabase.client.rpc('get_global_leaderboard')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as LeaderboardUserRow[];
      }),
    );
  }

  getMyTribeLeaderboard(): Observable<LeaderboardUserRow[]> {
    return from(this.supabase.client.rpc('get_my_tribe_leaderboard')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as LeaderboardUserRow[];
      }),
    );
  }

  getTribesLeaderboard(): Observable<TribesLeaderboardRow[]> {
    return from(this.supabase.client.rpc('get_tribes_leaderboard')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TribesLeaderboardRow[];
      }),
    );
  }
}
