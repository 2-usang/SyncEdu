import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// 루트 접근 시 로그인 상태와 역할에 따라 리다이렉트
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인 → 로그인 페이지
  if (!user) {
    redirect('/login');
  }

  // 역할 조회 후 역할별 페이지로 이동
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'instructor') {
    redirect('/instructor');
  }

  redirect('/student');
}
