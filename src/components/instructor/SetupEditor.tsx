'use client';

import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CheckpointItem = {
  id?: string;
  title: string;
  description: string;
  estimated_minutes: number;
};

type SetupEditorProps = {
  initialTitle: string;
  initialCheckpoints: CheckpointItem[];
  saveAction: (formData: FormData) => void | Promise<void>;
  startAction: (formData: FormData) => void | Promise<void>;
};

function createEmptyCheckpoint(): CheckpointItem {
  return {
    title: '',
    description: '',
    estimated_minutes: 10,
  };
}

function moveItem(items: CheckpointItem[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [target] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, target);
  return nextItems;
}

export function SetupEditor({
  initialTitle,
  initialCheckpoints,
  saveAction,
  startAction,
}: SetupEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>(
    initialCheckpoints.length > 0 ? initialCheckpoints : [createEmptyCheckpoint()]
  );

  const serializedCheckpoints = JSON.stringify(checkpoints);

  return (
    <form action={saveAction} className="space-y-6">
      <input type="hidden" name="checkpoints" value={serializedCheckpoints} readOnly />

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>수업 제목을 수정하고 공개 전 구성을 정리하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="class-title">수업 제목</Label>
          <Input
            id="class-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="수업 제목을 입력하세요"
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>체크포인트</CardTitle>
            <CardDescription>
              학습 흐름에 맞춰 추가, 수정, 삭제하고 순서를 조정할 수 있습니다.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCheckpoints((current) => [...current, createEmptyCheckpoint()])}
          >
            <Plus />
            체크포인트 추가
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.id ?? `new-${index}`} className="rounded-xl border p-4">
              <input type="hidden" value={checkpoint.id ?? ''} readOnly aria-hidden="true" />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <GripVertical className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium">체크포인트 {index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      학습 단계와 예상 시간을 설정하세요.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCheckpoints((current) => moveItem(current, index, index - 1))}
                    disabled={index === 0}
                  >
                    위로
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCheckpoints((current) => moveItem(current, index, index + 1))}
                    disabled={index === checkpoints.length - 1}
                  >
                    아래로
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setCheckpoints((current) =>
                        current.length === 1
                          ? [createEmptyCheckpoint()]
                          : current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    aria-label={`체크포인트 ${index + 1} 삭제`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`checkpoint-title-${index}`}>제목</Label>
                  <Input
                    id={`checkpoint-title-${index}`}
                    value={checkpoint.title}
                    onChange={(event) =>
                      setCheckpoints((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 상태 관리 패턴 이해하기"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`checkpoint-description-${index}`}>설명</Label>
                  <textarea
                    id={`checkpoint-description-${index}`}
                    value={checkpoint.description}
                    onChange={(event) =>
                      setCheckpoints((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: event.target.value } : item
                        )
                      )
                    }
                    placeholder="학생이 이 단계에서 무엇을 해야 하는지 적어주세요"
                    className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`checkpoint-minutes-${index}`}>예상 소요 시간 (분)</Label>
                  <Input
                    id={`checkpoint-minutes-${index}`}
                    type="number"
                    min={1}
                    step={1}
                    value={checkpoint.estimated_minutes}
                    onChange={(event) =>
                      setCheckpoints((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                estimated_minutes: Number(event.target.value) || 0,
                              }
                            : item
                        )
                      )
                    }
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline">
          설정 저장
        </Button>
        <Button formAction={startAction} type="submit">
          수업 시작
        </Button>
      </div>
    </form>
  );
}
