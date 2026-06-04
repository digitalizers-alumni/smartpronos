import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly _client: SupabaseClient;

  constructor() {
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante.');
    }

    this._client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
