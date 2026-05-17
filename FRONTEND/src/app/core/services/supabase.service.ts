import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly _client: SupabaseClient;

  constructor() {
    this._client = createClient(
      environment.supabaseUrl || 'https://placeholder.supabase.co',
      environment.supabaseAnonKey || 'placeholder-key',
    );
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
