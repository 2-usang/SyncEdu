import { redirect } from 'next/navigation';

import JoinClassForm from '@/components/student/JoinClassForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'student') redirect('/instructor');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">수업 입장</CardTitle>
          <CardDescription className="text-gray-400">
            강사에게 받은 6자리 수업 코드를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinClassForm />
        </CardContent>
      </Card>
    </div>
  );
}
