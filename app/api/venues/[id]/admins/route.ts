import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const displayName = String(body.displayName ?? '').trim();
  const password = String(body.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Initial password must be at least 8 characters.' }, { status: 400 });

  const { data: venue } = await supabase.from('locations').select('id,name').eq('id', params.id).maybeSingle();
  if (!venue) return NextResponse.json({ error: 'Venue not found.' }, { status: 404 });

  const { data: existing } = await supabase.from('users').select('uid,role,location_id').eq('email', email).maybeSingle();
  if (existing) {
    if (existing.role === 'superadmin') {
      // A superadmin already has access to every venue. Record it as this
      // venue's primary administrator without weakening their global role.
      await supabase.from('locations').update({ admin_uid: existing.uid }).eq('id', venue.id);
      return NextResponse.json({ ok: true, existing: true, global: true });
    }
    return NextResponse.json({ error: 'That email already has an account. Existing venue-admin accounts are not moved between venues.' }, { status: 409 });
  }

  const uid = `admin-${uuidv4()}`;
  const { error: insertError } = await supabase.from('users').insert({
    uid,
    email,
    display_name: displayName || email,
    role: 'admin',
    location_id: venue.id,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: passwordError } = await supabase.rpc('set_user_password', { p_uid: uid, p_password: password });
  if (passwordError) {
    await supabase.from('users').delete().eq('uid', uid);
    return NextResponse.json({ error: `Account was not created: ${passwordError.message}` }, { status: 500 });
  }

  // Preserve the original locations.admin_uid convention for the first
  // venue-specific administrator while allowing additional admins via users.
  const { data: currentVenue } = await supabase.from('locations').select('admin_uid').eq('id', venue.id).maybeSingle();
  if (!currentVenue?.admin_uid) await supabase.from('locations').update({ admin_uid: uid }).eq('id', venue.id);
  return NextResponse.json({ ok: true, uid });
}
