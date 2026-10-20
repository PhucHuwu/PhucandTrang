import { NextResponse, type NextRequest } from 'next/server';

/**
 * UX guard only: sends visitors without a session cookie straight to the login page.
 * Real authorization still happens in the backend on every API call.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }
  if (!request.cookies.get('admin_access_token')?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
