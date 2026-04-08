import { redirect } from 'next/navigation';

import ClassRoom from '@/components/student/ClassRoom';
import { createClient } from '@/lib/supabase/server';

type StudentClassPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentClassPage({ params }: StudentClassPageProps) {
  const { id: classId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'student') redirect('/');

  // 수업 정보 조회
  const { data: classItem } = await supabase
    .from('classes')
    .select('id, title, status, current_checkpoint_order')
    .eq('id', classId)
    .maybeSingle();

  if (!classItem) redirect('/student');
  if (classItem.status === 'ended') redirect('/student');

  // 학생 세션 조회 — 없으면 입장 페이지로
  const { data: session } = await supabase
    .from('student_sessions')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', profile.id)
    .maybeSingle();

  if (!session) redirect('/student');

  // 체크포인트 목록 조회
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('id, title, description, estimated_minutes, order_num')
    .eq('class_id', classId)
    .order('order_num', { ascending: true });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h1 className="text-sm font-medium text-gray-300">{classItem.title}</h1>
      </div>
      <ClassRoom
        classId={classId}
        sessionId={session.id}
        checkpoints={checkpoints ?? []}
        initialCheckpointOrder={classItem.current_checkpoint_order ?? 1}
      />
    </div>
  );
}
