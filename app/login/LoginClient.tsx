'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { safeInternalPath } from '@/lib/redirect';

function EmailSignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      window.sessionStorage.setItem('uf_google_auth_next', next);

      const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });

      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Sign-in failed');
      }

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <p className="text-xl font-bold text-gray-900">Ultimate Fan</p>
        <p className="text-xs text-gray-500 mt-1">Admin Console</p>
      </div>

      <div className="card space-y-4">
        <h1 className="text-lg font-semibold text-primary">Sign in</h1>
        <p className="text-secondary text-sm">
          Access is restricted to authorized admin accounts.
        </p>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6 12 6Z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or use your password</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-sm text-secondary mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-amber-DEFAULT"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-amber-DEFAULT"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : null}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense>
      <EmailSignInForm />
    </Suspense>
  );
}
