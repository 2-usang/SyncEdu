import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

/**
 * API 라우트에서 요청 쿠키를 기반으로 인증된 사용자를 확인하는 헬퍼
 * 인증 실패 시 null 반환
 */
export async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // API 라우트에서는 쿠키 설정 불필요
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
