import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

export interface LeaderboardUserRow {
  rank: number | string;
  user_id: string;
  username: string | null;
  total_points: number | string;
  exact_count: number | string;
  avatar_path: string | null;
}

export interface TribesLeaderboardRow {
  rank: number | string;
  tribe_id: string;
  name: string;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
  is_country_tribe: boolean;
  country_flag_url: string | null;
  avatar_path: string | null;
}

export interface CurrentUserTribe {
  tribe_id: string | null;
  tribe_name: string | null;
  is_country_tribe?: boolean | null;
  country_flag_url?: string | null;
  avatar_path?: string | null;
}

export interface UserTribe {
  tribe_id: string;
  tribe_name: string;
  is_country_tribe: boolean;
  joined_at: string;
  country_flag_url: string | null;
  avatar_path: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly supabase = inject(SupabaseService);

  getCurrentUserTribe(): Observable<CurrentUserTribe> {
    return from(
      this.supabase.client
        .from('current_user_tribe')
        .select('tribe_id, tribe_name, is_country_tribe, country_flag_url, avatar_path')
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          tribe_id: data?.tribe_id ?? null,
          tribe_name: data?.tribe_name ?? null,
          is_country_tribe: data?.is_country_tribe ?? null,
          country_flag_url: data?.country_flag_url ?? null,
          avatar_path: data?.avatar_path ?? null,
        };
      }),
    );
  }

  getCurrentUserTribes(): Observable<UserTribe[]> {
    return from(
      this.supabase.client
        .from('current_user_tribes')
        .select('tribe_id, tribe_name, is_country_tribe, joined_at, country_flag_url, avatar_path')
        .order('is_country_tribe', { ascending: false })
        .order('joined_at', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as UserTribe[];
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

  getTribeLeaderboard(tribeId: string): Observable<LeaderboardUserRow[]> {
    return from(
      this.supabase.client
        .from('tribe_members_with_scores')
        .select('user_id, username, total_points, exact_count, avatar_path')
        .eq('tribe_id', tribeId)
        .order('total_points', { ascending: false })
        .order('exact_count', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((row, index) => ({
          rank: index + 1,
          user_id: row.user_id,
          username: row.username,
          total_points: row.total_points,
          exact_count: row.exact_count,
          avatar_path: row.avatar_path,
        })) as LeaderboardUserRow[];
      }),
    );
  }

  getTribesLeaderboard(): Observable<TribesLeaderboardRow[]> {
    return from(this.supabase.client.rpc('get_tribes_leaderboard_with_flags')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TribesLeaderboardRow[];
      }),
    );
  }
}
