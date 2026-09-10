import { NextRequest, NextResponse } from 'next/server';

// Keep this network-boundary check independent of lib/session, which performs
// the full signed-session verification in server route handlers and pages.
const SESSION_COOKIE = 'uf_admin_session';

// Routes that don't need auth
const PUBLIC_ROUTES = ['/login', '/api/auth/session'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and static files through
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check session cookie exists (full verification happens in route handlers / pages)
  const session = req.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
