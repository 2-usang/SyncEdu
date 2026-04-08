import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

type LivePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InstructorClassLivePage({ params }: LivePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'instructor') {
    redirect('/');
  }

  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select('id, title, class_code, status')
    .eq('id', id)
    .eq('instructor_id', profile.id)
    .maybeSingle();

  if (classError) {
    throw new Error(classError.message);
  }

  if (!classItem) {
    redirect('/instructor');
  }

  const { data: checkpoints, error: checkpointError } = await supabase
    .from('checkpoints')
    .select('id, title, description, estimated_minutes, order_num')
    .eq('class_id', classItem.id)
    .order('order_num', { ascending: true });

  if (checkpointError) {
    throw new Error(checkpointError.message);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
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
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Checkpoint Count</p>
              <p className="mt-1 text-3xl font-semibold">{checkpoints?.length ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border border-white/10 bg-white/5 py-0 text-white">
            <CardHeader className="pt-6">
              <CardTitle>오늘의 진행 체크포인트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {checkpoints && checkpoints.length > 0 ? (
                checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-medium">
                        {checkpoint.order_num}. {checkpoint.title}
                      </h2>
                      <span className="text-sm text-zinc-300">
                        {checkpoint.estimated_minutes}분
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {checkpoint.description || '설명이 아직 입력되지 않았습니다.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-zinc-300">
                  아직 설정된 체크포인트가 없습니다. 설정 페이지에서 수업 흐름을 먼저 구성해주세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 py-0 text-white">
            <CardHeader className="pt-6">
              <CardTitle>라이브 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6 text-sm text-zinc-300">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                학생 입장과 진행 데이터가 여기에 연결될 준비가 끝났습니다.
              </div>
              <Link href="/instructor" className={buttonVariants({ variant: 'outline' })}>
                강사 메인으로 이동
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
