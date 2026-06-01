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

export interface CompaniesLeaderboardRow {
  rank: number | string;
  company_id: string;
  name: string;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
}

export interface CurrentUserCompany {
  company_id: string | null;
  company_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly supabase = inject(SupabaseService);

  getCurrentUserCompany(): Observable<CurrentUserCompany> {
    return from(
      this.supabase.client
        .from('current_user_profile')
        .select('company_id, company_name')
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          company_id: data?.company_id ?? null,
          company_name: data?.company_name ?? null,
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

  getCompanyLeaderboard(companyId: string): Observable<LeaderboardUserRow[]> {
    return from(
      this.supabase.client.rpc('get_company_leaderboard', {
        p_company_id: companyId,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as LeaderboardUserRow[];
      }),
    );
  }

  getCompaniesLeaderboard(): Observable<CompaniesLeaderboardRow[]> {
    return from(this.supabase.client.rpc('get_companies_leaderboard')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as CompaniesLeaderboardRow[];
      }),
    );
  }
}
