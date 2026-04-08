'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { StudentStatus } from '@/types';

type StudentState = {
  student_id: string;
  student_name: string;
  status: StudentStatus | null;
};

type LiveDashboardProps = {
  classId: string;
  initialStudents: StudentState[];
  checkpoints: { id: string; title: string; order_num: number }[];
  initialCheckpointOrder: number;
};

const STATUS_COLOR: Record<StudentStatus, string> = {
  understanding: 'bg-green-500',
  confused: 'bg-yellow-500',
  stuck: 'bg-red-500',
};

const STATUS_LABEL: Record<StudentStatus, string> = {
  understanding: '이해됨',
  confused: '애매함',
  stuck: '막힘',
};

export default function LiveDashboard({
  classId,
  initialStudents,
  checkpoints,
  initialCheckpointOrder,
}: LiveDashboardProps) {
  const [students, setStudents] = useState<StudentState[]>(initialStudents);
  const [currentOrder, setCurrentOrder] = useState(initialCheckpointOrder);
  const [advancing, setAdvancing] = useState(false);

  const currentCheckpoint = checkpoints.find((cp) => cp.order_num === currentOrder);

  // Supabase Realtime — 학생 상태 변경 즉시 반영
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`live-dashboard:${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_status',
        },
        async (payload) => {
          const sessionId = payload.new.session_id;
          const newStatus = payload.new.status as StudentStatus;

          // 세션 ID로 student_id 조회
          const { data: sessionData } = await supabase
            .from('student_sessions')
            .select('student_id, profiles(name)')
            .eq('id', sessionId)
            .eq('class_id', classId)
            .maybeSingle();

          if (!sessionData) return;

          const studentId = sessionData.student_id;
          const studentName =
            (sessionData.profiles as unknown as { name: string } | null)?.name ?? '알 수 없음';

          setStudents((prev) => {
            const exists = prev.find((s) => s.student_id === studentId);
            if (exists) {
              return prev.map((s) =>
                s.student_id === studentId ? { ...s, status: newStatus } : s
              );
            }
            return [
              ...prev,
              { student_id: studentId, student_name: studentName, status: newStatus },
            ];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_sessions',
          filter: `class_id=eq.${classId}`,
        },
        async (payload) => {
          // 새 학생 입장 시 목록에 추가
          const { data: profileData } = await createClient()
            .from('profiles')
            .select('id, name')
            .eq('id', payload.new.student_id)
            .maybeSingle();

          if (!profileData) return;

          setStudents((prev) => {
            const exists = prev.find((s) => s.student_id === profileData.id);
            if (exists) return prev;
            return [
              ...prev,
              { student_id: profileData.id, student_name: profileData.name, status: null },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  // 체크포인트 전환
  async function handleAdvanceCheckpoint() {
    if (advancing || currentOrder >= checkpoints.length) return;
    setAdvancing(true);

    const supabase = createClient();
    const nextOrder = currentOrder + 1;

    const { error } = await supabase
      .from('classes')
      .update({ current_checkpoint_order: nextOrder })
      .eq('id', classId);

    if (!error) {
      setCurrentOrder(nextOrder);
      // 학생 상태 초기화 (새 체크포인트 시작)
      setStudents((prev) => prev.map((s) => ({ ...s, status: null })));
    }

    setAdvancing(false);
  }

  // 이해도 통계
  const statusCounts = students.reduce(
    (acc, s) => {
      if (s.status) acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StudentStatus, number>
  );

  const total = students.length;
  const respondedTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* 현재 체크포인트 + 전환 버튼 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">
              체크포인트 {currentOrder} / {checkpoints.length}
            </p>
            <h2 className="text-xl font-semibold">
              {currentCheckpoint?.title ?? '체크포인트 없음'}
            </h2>
          </div>
          {currentOrder < checkpoints.length && (
            <button
              onClick={handleAdvanceCheckpoint}
              disabled={advancing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {advancing ? '전환 중...' : '다음 체크포인트 →'}
            </button>
          )}
        </div>
      </div>

      {/* 이해도 요약 바 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">이해도 현황</h3>
          <span className="text-sm text-zinc-400">
            {total}명 중 {respondedTotal}명 응답
          </span>
        </div>

        {respondedTotal > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {(['understanding', 'confused', 'stuck'] as StudentStatus[]).map((status) => {
              const count = statusCounts[status] ?? 0;
              const pct = Math.round((count / respondedTotal) * 100);
              if (pct === 0) return null;
              return (
                <div
                  key={status}
                  className={`${STATUS_COLOR[status]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${STATUS_LABEL[status]}: ${count}명 (${pct}%)`}
                />
              );
            })}
          </div>
        )}

        <div className="flex gap-4 text-sm">
          {(['understanding', 'confused', 'stuck'] as StudentStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR[status]}`} />
              <span className="text-zinc-300">
                {STATUS_LABEL[status]} {statusCounts[status] ?? 0}명
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 학생 히트맵 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="font-semibold">학생 상태</h3>
        {total === 0 ? (
          <p className="text-sm text-zinc-400">아직 입장한 학생이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {students.map((student) => (
              <div
                key={student.student_id}
                className={`rounded-xl p-3 border transition-colors ${
                  student.status
                    ? `${STATUS_COLOR[student.status]} border-transparent`
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <p className="text-sm font-medium truncate">{student.student_name}</p>
                <p className="text-xs mt-0.5 opacity-80">
                  {student.status ? STATUS_LABEL[student.status] : '대기 중'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
