'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface StudentHeaderProps {
  name: string;
}

export default function StudentHeader({ name }: StudentHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold text-lg">SyncEdu</span>
          <span className="text-gray-500 text-sm">수강생</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-300 text-sm">{name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
