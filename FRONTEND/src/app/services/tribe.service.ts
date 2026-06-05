import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, switchMap } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

interface RpcJsonResponse<T> {
  success: boolean;
  error_code?: string;
  message?: string;
  data?: T;
}

export interface CurrentTribeProfile {
  tribe_id: string | null;
  tribe_name: string | null;
  is_country_tribe: boolean | null;
  country_flag_url: string | null;
  avatar_path: string | null;
}

export interface UserTribe {
  tribe_id: string;
  tribe_name: string;
  is_country_tribe: boolean;
  joined_at: string;
  country_flag_url: string | null;
  avatar_path: string | null;
}

export interface TribeMemberWithScore {
  tribe_id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  total_points: number | string;
  exact_count: number | string;
  joined_at: string;
}

export interface TribeScore {
  tribe_id: string;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
}

export interface TribeInviteInfo {
  tribe_id: string;
  tribe_name: string;
  invite_code: string;
  member_count: number | string;
  is_country_tribe: boolean;
  country_flag_url: string | null;
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

export interface TribeDashboard {
  profile: CurrentTribeProfile;
  userTribes: UserTribe[];
  members: TribeMemberWithScore[];
  score: TribeScore | null;
  invite: TribeInviteInfo | null;
  tribesLeaderboard: TribesLeaderboardRow[];
}

@Injectable({ providedIn: 'root' })
export class TribeService {
  private readonly supabase = inject(SupabaseService);

  getDashboard(selectedTribeId?: string | null): Observable<TribeDashboard> {
    return forkJoin({
      userTribes: this.getUserTribes(),
      tribesLeaderboard: this.getTribesLeaderboard(),
    }).pipe(
      switchMap(({ userTribes, tribesLeaderboard }) => {
        const selectedTribe =
          userTribes.find((tribe) => tribe.tribe_id === selectedTribeId) ??
          userTribes.find((tribe) => tribe.is_country_tribe) ??
          userTribes[0] ??
          null;
        const profile: CurrentTribeProfile = {
          tribe_id: selectedTribe?.tribe_id ?? null,
          tribe_name: selectedTribe?.tribe_name ?? null,
          is_country_tribe: selectedTribe?.is_country_tribe ?? null,
          country_flag_url: selectedTribe?.country_flag_url ?? null,
          avatar_path: selectedTribe?.avatar_path ?? null,
        };

        if (!profile.tribe_id) {
          return from([{
            profile,
            userTribes,
            members: [],
            score: null,
            invite: null,
            tribesLeaderboard,
          }]);
        }

        return forkJoin({
          members: this.getMembers(profile.tribe_id),
          score: this.getScore(profile.tribe_id),
          invite: this.getInviteInfo(profile.tribe_id),
        }).pipe(
          map(({ members, score, invite }) => ({
            profile,
            userTribes,
            members,
            score,
            invite,
            tribesLeaderboard,
          })),
        );
      }),
    );
  }

  createTribe(name: string): Observable<void> {
    return from(
      this.supabase.client.rpc('create_tribe', {
        p_name: name,
      }),
    ).pipe(map(({ data, error }) => this.assertRpcSuccess(data, error)));
  }

  joinTribe(inviteCode: string): Observable<void> {
    return from(
      this.supabase.client.rpc('join_tribe_by_invite_code', {
        p_invite_code: inviteCode,
      }),
    ).pipe(map(({ data, error }) => this.assertRpcSuccess(data, error)));
  }

  leaveTribe(tribeId: string): Observable<void> {
    return from(
      this.supabase.client.rpc('leave_tribe', {
        p_tribe_id: tribeId,
      }),
    ).pipe(map(({ data, error }) => this.assertRpcSuccess(data, error)));
  }

  private getUserTribes(): Observable<UserTribe[]> {
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

  private getMembers(tribeId: string): Observable<TribeMemberWithScore[]> {
    return from(
      this.supabase.client
        .from('tribe_members_with_scores')
        .select('tribe_id, user_id, username, avatar_url, avatar_path, total_points, exact_count, joined_at')
        .eq('tribe_id', tribeId)
        .order('total_points', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TribeMemberWithScore[];
      }),
    );
  }

  private getScore(tribeId: string): Observable<TribeScore | null> {
    return from(
      this.supabase.client
        .from('tribe_scores')
        .select('tribe_id, member_count, active_member_count, avg_points, total_points')
        .eq('tribe_id', tribeId)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as TribeScore | null;
      }),
    );
  }

  private getInviteInfo(tribeId: string): Observable<TribeInviteInfo | null> {
    return from(
      this.supabase.client
        .from('tribe_invite_info')
        .select('tribe_id, tribe_name, invite_code, member_count, is_country_tribe, country_flag_url, avatar_path')
        .eq('tribe_id', tribeId)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as TribeInviteInfo | null;
      }),
    );
  }

  private getTribesLeaderboard(): Observable<TribesLeaderboardRow[]> {
    return from(this.supabase.client.rpc('get_tribes_leaderboard_with_flags')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as TribesLeaderboardRow[];
      }),
    );
  }

  private assertRpcSuccess<T>(data: unknown, error: unknown): void {
    if (error) throw error;
    const result = data as RpcJsonResponse<T> | null;
    if (!result?.success) {
      throw new Error(result?.message ?? 'Action impossible.');
    }
  }
}
