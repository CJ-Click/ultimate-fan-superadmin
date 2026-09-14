import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, SESSION_COOKIE } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Google sign-in token' }, { status: 401 });
    }

    // getUser performs a request to Supabase Auth, so identity is verified on
    // the server instead of trusting user data supplied by the browser.
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const email = authData.user?.email?.trim().toLowerCase();

    if (authError || !authData.user || !email) {
      return NextResponse.json({ error: 'Google sign-in could not be verified' }, { status: 401 });
    }

    // Supabase Auth proves who the user is; this application-owned table remains
    // the source of truth for whether that identity may access SuperAdmin.
    const { data: admin, error: roleError } = await supabase
      .from('users')
      .select('uid, email, role')
      .eq('email', email)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (roleError) {
      console.error('Google superadmin role check failed:', roleError.message);
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 500 });
    }

    if (!admin?.uid || admin.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. This Google account does not have superadmin privileges.' },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, createSessionCookie(admin.uid, email), {
      maxAge: SESSION_DURATION_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google sign-in failed:', message);
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 500 });
  }
}
