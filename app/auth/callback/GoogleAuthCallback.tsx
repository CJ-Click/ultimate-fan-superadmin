'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { safeInternalPath } from '@/lib/redirect';

export default function GoogleAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishSignIn() {
      const oauthError = params.get('error_description') ?? params.get('error');
      if (oauthError) throw new Error(oauthError);

      const code = params.get('code');
      if (!code) throw new Error('Google did not return a sign-in code. Please try again.');

      const authClient = getSupabaseBrowserClient();
      const { data, error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
      if (exchangeError || !data.session?.access_token) {
        throw new Error(exchangeError?.message ?? 'Google sign-in could not be completed.');
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const result = await res.json();

      // The app uses its own HTTP-only session after the one-time identity check.
      // Clear the browser's Supabase session so its refresh token is not retained.
      await authClient.auth.signOut({ scope: 'local' });

      if (!res.ok) throw new Error(result.error ?? 'Google sign-in failed.');

      const destination = safeInternalPath(window.sessionStorage.getItem('uf_google_auth_next'));
      window.sessionStorage.removeItem('uf_google_auth_next');
      router.replace(destination);
      router.refresh();
    }

    finishSignIn().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    });
  }, [params, router]);

  return (
    <div className="card w-full max-w-sm text-center space-y-4">
      <p className="text-xl font-bold text-gray-900">Ultimate Fan</p>
      {error ? (
        <>
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => router.replace('/login')}>
            Return to sign in
          </button>
        </>
      ) : (
        <div className="flex items-center justify-center gap-3 text-sm text-secondary">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          Verifying your Google account…
        </div>
      )}
    </div>
  );
}
