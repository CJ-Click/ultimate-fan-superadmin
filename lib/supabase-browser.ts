'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Google sign-in is not configured yet. Use password sign-in for now.');
  }

  client = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      // The callback explicitly exchanges the code after it loads. Automatic
      // detection would race that exchange and consume the PKCE verifier first.
      detectSessionInUrl: false,
    },
  });

  return client;
}
