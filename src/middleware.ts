import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 비로그인 사용자가 보호된 라우트 접근 시 /login으로 리다이렉트
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 로그인 사용자의 역할 기반 접근 제어
  if (user && (pathname.startsWith('/instructor') || pathname.startsWith('/student'))) {
    // role을 헤더에서 먼저 확인 (같은 요청 내 중복 조회 방지)
    const cachedRole = request.headers.get('x-user-role');

    let role = cachedRole;

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      role = profile?.role ?? null;
    }

    // /instructor는 instructor만 접근 가능
    if (pathname.startsWith('/instructor') && role !== 'instructor') {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
      return NextResponse.redirect(url);
    }

    // /student는 student만 접근 가능
    if (pathname.startsWith('/student') && role !== 'student') {
      const url = request.nextUrl.clone();
      url.pathname = '/instructor';
      return NextResponse.redirect(url);
    }

    // 다음 요청에서 재사용할 수 있도록 role을 헤더에 심기
    supabaseResponse.headers.set('x-user-role', role ?? '');
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
