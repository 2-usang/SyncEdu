'use client';

import { useActionState } from 'react';

import { joinClassAction } from '@/app/student/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function JoinClassForm() {
  const [error, action, isPending] = useActionState(
    async (_: string | null, formData: FormData) => {
      try {
        await joinClassAction(formData);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : '오류가 발생했습니다.';
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code" className="text-gray-300">
          수업 코드
        </Label>
        <Input
          id="code"
          name="code"
          type="text"
          placeholder="예: AB12CD"
          maxLength={6}
          required
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-center text-2xl tracking-widest font-bold uppercase"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isPending ? '입장 중...' : '수업 입장'}
      </Button>
    </form>
  );
}
