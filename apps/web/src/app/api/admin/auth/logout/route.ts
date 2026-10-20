import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSameOriginRequest } from '../../sameOrigin';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: 'Yêu cầu không hợp lệ' }, { status: 403 });
  }
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_access_token');
    cookieStore.delete('admin_user');

    return NextResponse.json({ success: true, message: 'Đã đăng xuất thành công' });
  } catch (error: any) {
    console.error('[admin logout] Failed:', error?.message || error);
    return NextResponse.json({ message: 'Không thể đăng xuất. Vui lòng thử lại.' }, { status: 500 });
  }
}
