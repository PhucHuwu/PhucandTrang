import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

/**
 * Next.js hands us already-decoded segments, so `%2F..%2F` arrives as a segment containing
 * `/../`. Reject anything that could change the resolved path, then re-encode each segment.
 */
function buildTargetPath(path: string[]): string | null {
  if (!Array.isArray(path) || path.length === 0) return null;
  for (const segment of path) {
    if (!segment || segment === '.' || segment === '..') return null;
    if (/[\/\\]/.test(segment) || segment.includes('\0')) return null;
  }
  return path.map((segment) => encodeURIComponent(segment)).join('/');
}

async function handleProxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = buildTargetPath(path);
  if (!targetPath) {
    return NextResponse.json({ message: 'Đường dẫn API không hợp lệ' }, { status: 400 });
  }

  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  let body: any = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    // Responses with these statuses must not carry a body
    if (backendRes.status === 204 || backendRes.status === 304) {
      return new NextResponse(null, { status: backendRes.status });
    }

    const resContentType = backendRes.headers.get('content-type');
    if (resContentType && resContentType.includes('application/json')) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const text = await backendRes.text();
    return new NextResponse(text, {
      status: backendRes.status,
      headers: {
        'content-type': resContentType || 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('[admin proxy] Backend request failed:', error?.message || error);
    return NextResponse.json(
      { message: 'Không thể kết nối tới máy chủ. Vui lòng thử lại.' },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
