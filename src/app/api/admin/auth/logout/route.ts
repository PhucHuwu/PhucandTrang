import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_access_token');
    cookieStore.delete('admin_user');

    return NextResponse.json({ success: true, message: 'Đã đăng xuất thành công' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
