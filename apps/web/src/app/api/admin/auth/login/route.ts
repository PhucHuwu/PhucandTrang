import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSameOriginRequest } from '../../sameOrigin';
import { tokenCookieMaxAge } from '../../tokenMaxAge';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: 'Yêu cầu không hợp lệ' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { pass } = body;

    if (!pass) {
      return NextResponse.json(
        { message: 'Vui lòng nhập mật khẩu quản trị' },
        { status: 400 }
      );
    }

    // Forward the end-user IP so the backend rate-limits per browser instead of per BFF instance
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';

    // The backend only trusts x-client-ip when it comes with the shared BFF secret
    const bffSecret = process.env.BFF_SHARED_SECRET;

    // Call backend login endpoint (password-only)
    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientIp ? { 'x-client-ip': clientIp } : {}),
        ...(bffSecret ? { 'x-bff-secret': bffSecret } : {}),
      },
      body: JSON.stringify({ pass }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || 'Mật khẩu không chính xác' },
        { status: backendRes.status }
      );
    }

    const { accessToken, user } = data;

    // Secure HttpOnly Cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'admin_access_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenCookieMaxAge(accessToken),
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi kết nối máy chủ xác thực' },
      { status: 500 }
    );
  }
}
