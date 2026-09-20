import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, pass } = body;

    if (!email || !pass) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    // Call backend login endpoint
    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pass }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || 'Đăng nhập không thành công' },
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
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Publicly readable user cookie for client UI state
    cookieStore.set({
      name: 'admin_user',
      value: JSON.stringify(user),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Lỗi kết nối máy chủ xác thực: ${error.message}` },
      { status: 500 }
    );
  }
}
