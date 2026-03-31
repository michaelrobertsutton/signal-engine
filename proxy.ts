import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /login and its POST handler are always accessible
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Cron routes are guarded by CRON_SECRET header (called by Vercel, not browser)
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // All other routes require a valid session cookie
  const session = request.cookies.get('session');
  if (!session || session.value !== process.env.SESSION_SECRET) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
