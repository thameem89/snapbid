import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (
    ['/dashboard', '/admin', '/payment', '/auth'].some((p) =>
      request.nextUrl.pathname.startsWith(p),
    )
  ) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && process.env.DEMO_MODE !== 'true') {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          for (const { name, value } of items) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of items)
            response.cookies.set(name, value, options);
          response.headers.set('Cache-Control', 'private, no-store');
        },
      },
    });
    await supabase.auth.getUser();
  }
  return response;
}
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/payment/:path*',
    '/auth/:path*',
  ],
};
