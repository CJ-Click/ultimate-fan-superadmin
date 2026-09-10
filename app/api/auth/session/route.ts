import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, SESSION_COOKIE } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

function withSession(uid: string, email: string) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionCookie(uid, email), {
    maxAge: SESSION_DURATION_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    // This route used to query
    //   .eq('email', email).eq('password', password)
    // against a `users.password` column that does not exist in the schema
    // (015_passwords_and_roles.sql added `password_hash`, and no migration ever
    // added a plaintext `password`). PostgREST therefore failed the request
    // outright, the error branch returned 401, and existing superadmin rows
    // with a valid password_hash could never sign in. It also meant passwords
    // were being compared in plaintext by design.
    //
    // Now verified through the verify_credentials RPC
    // (020_admin_password_required.sql), which bcrypt-checks password_hash
    // server-side. This is the only login path: do not add a shared environment
    // password fallback, because it bypasses account-level revocation and audit.
    const { data, error } = await supabase.rpc('verify_credentials', {
      p_email: normalized,
      p_password: password,
    });

    if (error) {
      console.error('verify_credentials failed:', error.message);
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 500 });
    }

    const result = data as {
      success?: boolean;
      uid?: string;
      role?: string;
      error?: string;
      password_required?: boolean;
    } | null;

    if (!result?.success) {
      // Not found, wrong password, and a passwordless row are deliberately
      // reported identically so this endpoint cannot enumerate accounts.
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Superadmin only. Venue admins (role='admin') are scoped to a single
    // location in their own admin panel; this console has no location scoping
    // at all — it lists every venue, player and game and can delete games — so
    // letting an 'admin' row in here would be a straight privilege escalation.
    // The previous code intended to allow both, but never actually ran (see
    // above), so restricting to superadmin changes no working login.
    if (result.role !== 'superadmin') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Belt-and-braces: verify_credentials has a legacy branch that reports
    // success with password_required=false for rows whose password_hash is NULL
    // (email-only player recovery). 020 already blocks that for admin roles;
    // refuse it here too so a passwordless row can never open a console session.
    if (result.password_required === false) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!result.uid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return withSession(result.uid, normalized);
  } catch (err: unknown) {
    console.error('SuperAdmin sign-in failed:', err);
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 500 });
  }
}
