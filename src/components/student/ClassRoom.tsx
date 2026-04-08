'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { StudentStatus } from '@/types';

type Checkpoint = {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  order_num: number;
};

type ClassRoomProps = {
  classId: string;
  sessionId: string;
  checkpoints: Checkpoint[];
  initialCheckpointOrder: number;
};

const STATUS_OPTIONS: { value: StudentStatus; label: string; color: string }[] = [
  {
    value: 'understanding',
    label: '이해됨',
    color: 'bg-green-600 hover:bg-green-500 border-green-600',
  },
  {
    value: 'confused',
    label: '애매함',
    color: 'bg-yellow-600 hover:bg-yellow-500 border-yellow-600',
  },
  { value: 'stuck', label: '막힘', color: 'bg-red-600 hover:bg-red-500 border-red-600' },
];

export default function ClassRoom({
  classId,
  sessionId,
  checkpoints,
  initialCheckpointOrder,
}: ClassRoomProps) {
  const router = useRouter();
  const [currentOrder, setCurrentOrder] = useState(initialCheckpointOrder);
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | null>(null);
  const [sending, setSending] = useState(false);

  // 현재 체크포인트
  const currentCheckpoint =
    checkpoints.find((cp) => cp.order_num === currentOrder) ?? checkpoints[0];

  // Supabase Realtime — 강사가 체크포인트 전환 시 즉시 반영
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`class-checkpoint:${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'classes',
          filter: `id=eq.${classId}`,
        },
        (payload) => {
          // 수업 종료 시 학생 메인으로 리다이렉트
          if (payload.new.status === 'ended') {
            router.push('/student');
            return;
          }

          const newOrder = payload.new.current_checkpoint_order;
          if (typeof newOrder === 'number') {
            setCurrentOrder(newOrder);
            setSelectedStatus(null); // 체크포인트 바뀌면 상태 초기화
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  // 상태 버튼 클릭 → API 호출
  async function handleStatusClick(status: StudentStatus) {
    if (sending || !currentCheckpoint) return;
    setSending(true);

    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          checkpoint_id: currentCheckpoint.id,
          status,
          source: 'manual',
        }),
      });

      if (res.ok) setSelectedStatus(status);
    } finally {
      setSending(false);
    }
  }

  if (!currentCheckpoint) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">아직 체크포인트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
      {/* 진행 상황 */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>체크포인트</span>
        <span className="font-bold text-white">{currentOrder}</span>
        <span>/</span>
        <span>{checkpoints.length}</span>
      </div>

      {/* 현재 체크포인트 */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{currentCheckpoint.title}</h2>
          <span className="text-sm text-gray-400">{currentCheckpoint.estimated_minutes}분</span>
        </div>
        {currentCheckpoint.description && (
          <p className="text-gray-300 text-sm leading-relaxed">{currentCheckpoint.description}</p>
        )}
      </div>

      {/* 상태 버튼 */}
      <div className="space-y-3">
        <p className="text-sm text-gray-400 text-center">현재 이해도를 선택하세요</p>
        <div className="grid grid-cols-3 gap-3">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusClick(option.value)}
              disabled={sending}
              className={`py-4 rounded-xl border-2 text-white font-semibold text-sm transition-all ${option.color} ${
                selectedStatus === option.value
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-105'
                  : 'opacity-80'
              } disabled:opacity-50`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {selectedStatus && (
          <p className="text-center text-sm text-gray-400">
            '{STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label}' 상태가 전송됐어요
          </p>
        )}
      </div>
    </div>
  );
}
