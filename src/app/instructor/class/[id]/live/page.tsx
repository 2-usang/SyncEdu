import Link from 'next/link';
import { redirect } from 'next/navigation';

import LiveDashboard from '@/components/instructor/LiveDashboard';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { StudentStatus } from '@/types';

type LivePageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorClassLivePage({ params }: LivePageProps) {
  const { id } = await params;
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

  if (!profile || profile.role !== 'instructor') redirect('/');

  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select('id, title, class_code, status, current_checkpoint_order')
    .eq('id', id)
    .eq('instructor_id', profile.id)
    .maybeSingle();

  if (classError) throw new Error(classError.message);
  if (!classItem) redirect('/instructor');

  const { data: checkpoints, error: checkpointError } = await supabase
    .from('checkpoints')
    .select('id, title, description, estimated_minutes, order_num')
    .eq('class_id', classItem.id)
    .order('order_num', { ascending: true });

  if (checkpointError) throw new Error(checkpointError.message);

  // 현재 수업에 입장한 학생 세션 + 최신 상태 조회
  const { data: sessions } = await supabase
    .from('student_sessions')
    .select('id, student_id, profiles(name)')
    .eq('class_id', classItem.id);

  // 학생별 최신 상태 조회
  const sessionIds = (sessions ?? []).map((s) => s.id);
  let latestStatusMap: Record<string, StudentStatus> = {};

  if (sessionIds.length > 0) {
    const { data: statuses } = await supabase
      .from('student_status')
      .select('session_id, status, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    const seen = new Set<string>();
    for (const s of statuses ?? []) {
      if (!seen.has(s.session_id)) {
        seen.add(s.session_id);
        latestStatusMap[s.session_id] = s.status as StudentStatus;
      }
    }
  }

  // 초기 학생 상태 목록 구성
  const initialStudents = (sessions ?? []).map((s) => ({
    student_id: s.student_id,
    student_name: (s.profiles as unknown as { name: string } | null)?.name ?? '알 수 없음',
    status: latestStatusMap[s.id] ?? null,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {/* 헤더 */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-green-500 text-white hover:bg-green-500/90">Live</Badge>
                <Link
                  href={`/instructor/class/${classItem.id}/setup`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  설정으로 돌아가기
                </Link>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{classItem.title}</h1>
                <p className="mt-2 text-sm text-zinc-300">
                  수업 코드{' '}
                  <span className="font-semibold tracking-[0.2em]">{classItem.class_code}</span>로
                  학생이 입장할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">학생 수</p>
              <p className="mt-1 text-3xl font-semibold">{initialStudents.length}</p>
            </div>
          </div>
        </section>

        {/* 실시간 대시보드 */}
        <LiveDashboard
          classId={classItem.id}
          initialStudents={initialStudents}
          checkpoints={checkpoints ?? []}
          initialCheckpointOrder={classItem.current_checkpoint_order ?? 1}
        />
      </div>
    </main>
  );
}
