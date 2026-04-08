import { createClient } from '@supabase/supabase-js';

/**
 * service_role 키를 사용하는 Supabase 어드민 클라이언트
 * RLS를 우회하므로 API 라우트(서버 사이드)에서만 사용할 것
 * 절대 브라우저 클라이언트에서 사용 금지
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
