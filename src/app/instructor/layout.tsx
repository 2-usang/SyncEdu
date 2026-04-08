import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import InstructorHeader from '@/components/instructor/InstructorHeader';

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role !== 'instructor') redirect('/student');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <InstructorHeader name={profile.name} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
