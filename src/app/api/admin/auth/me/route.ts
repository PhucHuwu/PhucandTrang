import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    const userCookie = cookieStore.get('admin_user')?.value;
    let user = null;
    if (userCookie) {
      try {
        user = JSON.parse(userCookie);
      } catch {
        // Fallback
      }
    }

    if (!user) {
      return NextResponse.json({ message: 'Thông tin người dùng không hợp lệ' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
