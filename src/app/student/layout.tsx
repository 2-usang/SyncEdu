import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StudentHeader from '@/components/student/StudentHeader';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') redirect('/instructor');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <StudentHeader name={profile.name} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
