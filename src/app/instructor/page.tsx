import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CreateClassDialog } from '@/components/instructor/CreateClassDialog';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { createClassAction } from './actions';

const statusLabelMap = {
  draft: 'Draft',
  live: 'Live',
  ended: 'Ended',
} as const;

const statusVariantMap = {
  draft: 'outline',
  live: 'default',
  ended: 'secondary',
} as const;

export default async function InstructorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'instructor') {
    redirect('/');
  }

  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, title, status, class_code, created_at')
    .eq('instructor_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-8 ring-1 ring-zinc-200 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-600">Instructor Console</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {profile.name} 강사의 수업 관리
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600">
              생성한 수업을 확인하고, 체크포인트를 정리한 뒤 바로 라이브 수업으로 전환할 수
              있습니다.
            </p>
          </div>
          <CreateClassDialog action={createClassAction} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">내 수업 목록</h2>
              <p className="text-sm text-zinc-600">
                총 {classes?.length ?? 0}개의 수업이 등록되어 있습니다.
              </p>
            </div>
          </div>

          {classes && classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((classItem) => {
                const status = classItem.status as keyof typeof statusLabelMap;

                return (
                  <Card key={classItem.id} className="border border-zinc-200 bg-white py-0">
                    <CardHeader className="pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{classItem.title}</CardTitle>
                          <CardDescription>
                            생성일{' '}
                            {new Intl.DateTimeFormat('ko-KR', {
                              dateStyle: 'medium',
                            }).format(new Date(classItem.created_at))}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={statusVariantMap[status]}
                          className={cn(
                            classItem.status === 'live' &&
                              'bg-green-500 text-white hover:bg-green-500/90'
                          )}
                        >
                          {statusLabelMap[status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-5">
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Class Code
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[0.3em] text-zinc-900">
                          {classItem.class_code}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <Link
                        href={`/instructor/class/${classItem.id}/setup`}
                        className={buttonVariants({ variant: 'outline' })}
                      >
                        설정 보기
                      </Link>
                      <Link
                        href={
                          classItem.status === 'live'
                            ? `/instructor/class/${classItem.id}/live`
                            : `/instructor/class/${classItem.id}/setup`
                        }
                        className={buttonVariants()}
                      >
                        {classItem.status === 'live' ? '라이브 대시보드' : '계속 편집'}
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border border-dashed border-zinc-300 bg-white py-0">
              <CardHeader className="pt-6">
                <CardTitle>아직 생성한 수업이 없습니다</CardTitle>
                <CardDescription>
                  새 수업을 만들고 체크포인트를 구성해 강사 대시보드를 시작하세요.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <CreateClassDialog action={createClassAction} />
              </CardFooter>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
