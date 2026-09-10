import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { supabase } from './supabase';

export const SESSION_COOKIE = 'uf_admin_session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set');
  return secret;
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function hmacSign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionCookie(uid: string, email: string): string {
  const exp = Date.now() + SESSION_DURATION_MS;
  const payload = b64url(JSON.stringify({ uid, email, exp }));
  const sig = hmacSign(payload);
  return `${payload}.${sig}`;
}

export function verifySession(token: string): { uid: string; email: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expectedSig = hmacSign(payload);
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;

    return { uid: data.uid, email: data.email };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ uid: string; email: string } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;
  const session = verifySession(cookie.value);
  if (!session) return null;

  // A signature proves that our server minted the cookie, not that its account
  // still has SuperAdmin authority. Re-check the current row so a revoked or
  // downgraded account loses access on its next page/API request rather than
  // retaining a five-day session.
  const { data, error } = await supabase
    .from('users')
    .select('uid, email, role')
    .eq('uid', session.uid)
    .eq('role', 'superadmin')
    .maybeSingle();
  if (error || !data) return null;

  return {
    uid: data.uid,
    email: typeof data.email === 'string' && data.email ? data.email : session.email,
  };
}

export const SESSION_DURATION_MS_EXPORT = SESSION_DURATION_MS;
