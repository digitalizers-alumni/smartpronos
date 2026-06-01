import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, switchMap } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { SupabaseService } from '../core/services/supabase.service';

interface RpcJsonResponse<T> {
  success: boolean;
  error_code?: string;
  message?: string;
  data?: T;
}

export interface CurrentCompanyProfile {
  company_id: string | null;
  company_name: string | null;
}

export interface CompanyMemberWithScore {
  company_id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number | string;
  exact_count: number | string;
  joined_at: string;
}

export interface CompanyScore {
  company_id: string;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
}

export interface CompanyInviteInfo {
  company_id: string;
  company_name: string;
  invite_code: string;
  member_count: number | string;
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

export interface CompanyDashboard {
  profile: CurrentCompanyProfile;
  members: CompanyMemberWithScore[];
  score: CompanyScore | null;
  invite: CompanyInviteInfo | null;
  companiesLeaderboard: CompaniesLeaderboardRow[];
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  getDashboard(): Observable<CompanyDashboard> {
    return this.getCurrentCompanyProfile().pipe(
      switchMap((profile) => {
        if (!profile.company_id) {
          return forkJoin({
            companiesLeaderboard: this.getCompaniesLeaderboard(),
          }).pipe(
            map(({ companiesLeaderboard }) => ({
              profile,
              members: [],
              score: null,
              invite: null,
              companiesLeaderboard,
            })),
          );
        }

        return forkJoin({
          members: this.getMembers(profile.company_id),
          score: this.getScore(profile.company_id),
          invite: this.getInviteInfo(profile.company_id),
          companiesLeaderboard: this.getCompaniesLeaderboard(),
        }).pipe(
          map(({ members, score, invite, companiesLeaderboard }) => ({
            profile,
            members,
            score,
            invite,
            companiesLeaderboard,
          })),
        );
      }),
    );
  }

  createCompany(name: string): Observable<void> {
    return from(
      this.supabase.client.rpc('create_company', {
        p_name: name,
      }),
    ).pipe(map(({ data, error }) => this.assertRpcSuccess(data, error)));
  }

  joinCompany(inviteCode: string): Observable<void> {
    return from(
      this.supabase.client.rpc('join_company_by_invite_code', {
        p_invite_code: inviteCode,
      }),
    ).pipe(map(({ data, error }) => this.assertRpcSuccess(data, error)));
  }

  leaveCompany(companyId: string): Observable<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      throw new Error('Utilisateur non connecté.');
    }

    return from(
      this.supabase.client
        .from('company_members')
        .delete()
        .eq('company_id', companyId)
        .eq('user_id', userId),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  private getCurrentCompanyProfile(): Observable<CurrentCompanyProfile> {
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

  private getMembers(companyId: string): Observable<CompanyMemberWithScore[]> {
    return from(
      this.supabase.client
        .from('company_members_with_scores')
        .select('company_id, user_id, username, avatar_url, total_points, exact_count, joined_at')
        .eq('company_id', companyId)
        .order('total_points', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as CompanyMemberWithScore[];
      }),
    );
  }

  private getScore(companyId: string): Observable<CompanyScore | null> {
    return from(
      this.supabase.client
        .from('company_scores')
        .select('company_id, member_count, active_member_count, avg_points, total_points')
        .eq('company_id', companyId)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as CompanyScore | null;
      }),
    );
  }

  private getInviteInfo(companyId: string): Observable<CompanyInviteInfo | null> {
    return from(
      this.supabase.client
        .from('company_invite_info')
        .select('company_id, company_name, invite_code, member_count')
        .eq('company_id', companyId)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as CompanyInviteInfo | null;
      }),
    );
  }

  private getCompaniesLeaderboard(): Observable<CompaniesLeaderboardRow[]> {
    return from(this.supabase.client.rpc('get_companies_leaderboard')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as CompaniesLeaderboardRow[];
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
