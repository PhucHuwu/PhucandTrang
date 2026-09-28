import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Prompt 40.1 Fix: Strictly verify JWT signature by delegating to backend /api/auth/me
    const backendRes = await fetch(`${BACKEND_INTERNAL_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' },
        { status: 401 }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({
      authenticated: true,
      user: data.user,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
