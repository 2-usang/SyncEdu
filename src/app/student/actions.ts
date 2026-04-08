'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// 학생 인증 및 프로필 확인
async function requireStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'student') redirect('/');

  return { supabase, profile };
}

// 수업 코드로 입장 — 중복 세션 방지 (upsert)
export async function joinClassAction(formData: FormData) {
  const code = (formData.get('code') as string)?.trim().toUpperCase();

  if (!code) throw new Error('수업 코드를 입력해주세요.');

  const { supabase, profile } = await requireStudent();

  // 수업 코드로 수업 조회
  const { data: classItem } = await supabase
    .from('classes')
    .select('id, status')
    .eq('class_code', code)
    .maybeSingle();

  if (!classItem) throw new Error('수업 코드를 다시 확인해주세요.');
  if (classItem.status === 'ended') throw new Error('이미 종료된 수업입니다.');

  // 기존 세션 조회 — 있으면 재사용 (새로고침해도 중복 생성 방지)
  const { data: existingSession } = await supabase
    .from('student_sessions')
    .select('id')
    .eq('class_id', classItem.id)
    .eq('student_id', profile.id)
    .maybeSingle();

  if (!existingSession) {
    const { error } = await supabase.from('student_sessions').insert({
      class_id: classItem.id,
      student_id: profile.id,
    });
    if (error) throw new Error('수업 입장에 실패했습니다.');
  }

  redirect(`/student/class/${classItem.id}`);
}
