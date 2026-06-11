import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  total_points: number | string;
  exact_count: number | string;
  total_predictions: number | string;
  rank: number | string | null;
  favorite_team_id: string | null;
  favorite_team_code: string | null;
  favorite_team_name: string | null;
  favorite_team_flag: string | null;
}

export interface PublicTribeMember {
  rank: number | string;
  user_id: string;
  username: string | null;
  avatar_path: string | null;
  total_points: number | string;
  exact_count: number | string;
}

export interface PublicTribe {
  id: string;
  name: string;
  avatar_path: string | null;
  is_country_tribe: boolean;
  country_flag_url: string | null;
  rank: number | string | null;
  member_count: number | string;
  active_member_count: number | string;
  avg_points: number | string;
  total_points: number | string;
  members: PublicTribeMember[];
}

@Injectable({ providedIn: 'root' })
export class PublicProfileService {
  private readonly supabase = inject(SupabaseService);

  getProfile(userId: string): Observable<PublicProfile | null> {
    return from(this.supabase.client.rpc('get_public_profile', { p_user_id: userId })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as PublicProfile | null;
      }),
    );
  }

  getTribe(tribeId: string): Observable<PublicTribe | null> {
    return from(this.supabase.client.rpc('get_public_tribe', { p_tribe_id: tribeId })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as PublicTribe | null;
      }),
    );
  }
}
