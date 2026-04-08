'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CreateClassDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateClassDialog({ action }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>새 수업 만들기</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 수업 만들기</DialogTitle>
          <DialogDescription>
            수업 제목을 입력하면 6자리 수업 코드가 자동으로 생성됩니다.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-title">수업 제목</Label>
            <Input
              id="class-title"
              name="title"
              placeholder="예: 프론트엔드 실전 프로젝트"
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit">생성하고 설정하기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
