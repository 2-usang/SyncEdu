import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SetupEditor } from '@/components/instructor/SetupEditor';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { saveClassSetupAction, startClassAction } from '../../../actions';

type SetupPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabelMap = {
  draft: 'Draft',
  live: 'Live',
  ended: 'Ended',
} as const;

const statusClassNameMap = {
  draft: 'border-zinc-200 text-zinc-700',
  live: 'bg-green-500 text-white',
  ended: 'bg-zinc-200 text-zinc-700',
} as const;

export default async function InstructorClassSetupPage({ params }: SetupPageProps) {
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

  const saveAction = saveClassSetupAction.bind(null, classItem.id);
  const startAction = startClassAction.bind(null, classItem.id);
  const status = classItem.status as keyof typeof statusLabelMap;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <section className="rounded-3xl bg-white p-8 ring-1 ring-zinc-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/instructor"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  목록으로
                </Link>
                <Badge
                  variant={classItem.status === 'draft' ? 'outline' : 'default'}
                  className={cn(statusClassNameMap[status])}
                >
                  {statusLabelMap[status]}
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  {classItem.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  수업 코드{' '}
                  <span className="font-semibold tracking-[0.2em]">{classItem.class_code}</span>를
                  학생에게 공유하기 전에 제목과 체크포인트 흐름을 확정하세요.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Class Code</p>
              <p className="mt-1 text-xl font-semibold tracking-[0.3em] text-zinc-900">
                {classItem.class_code}
              </p>
            </div>
          </div>
        </section>

        <SetupEditor
          initialTitle={classItem.title}
          initialCheckpoints={checkpoints ?? []}
          saveAction={saveAction}
          startAction={startAction}
        />
      </div>
    </main>
  );
}
