import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/supabase/api-auth';
import { StudentStatus, StatusSource } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

/*
 * [curl 테스트 예시]
 *
 * POST — 학생 상태 저장
 * curl -X POST http://localhost:3000/api/status \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "session_id": "uuid-here",
 *     "checkpoint_id": "uuid-here",
 *     "status": "stuck",
 *     "source": "manual"
 *   }'
 *
 * GET — 수업 학생 상태 목록 조회 (강사 대시보드용)
 * curl "http://localhost:3000/api/status?class_id=uuid-here"
 */

// 유효한 enum 값 목록
const VALID_STATUSES: StudentStatus[] = ['understanding', 'confused', 'stuck'];
const VALID_SOURCES: StatusSource[] = ['manual', 'auto_idle', 'auto_error', 'auto_delay'];

// POST — 학생 상태 저장
export async function POST(request: NextRequest) {
  try {
    // 인증 검증
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, checkpoint_id, status, source } = body;

    // 필수 필드 검증
    if (!session_id || !checkpoint_id || !status || !source) {
      return NextResponse.json(
        { success: false, error: 'session_id, checkpoint_id, status, source는 필수입니다.' },
        { status: 400 }
      );
    }

    // 유효한 status 값 검증
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status는 ${VALID_STATUSES.join(' | ')} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }

    // 유효한 source 값 검증
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { success: false, error: `source는 ${VALID_SOURCES.join(' | ')} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('student_status')
      .insert({ session_id, checkpoint_id, status, source })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET — 특정 수업의 학생별 최신 상태 조회 (강사 대시보드용)
export async function GET(request: NextRequest) {
  try {
    // 인증 검증
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get('class_id');

    // 필수 파라미터 검증
    if (!class_id) {
      return NextResponse.json(
        { success: false, error: 'class_id 쿼리 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 해당 수업에 참여 중인 학생 세션 목록 조회 (프로필 이름 포함)
    const { data: sessions, error: sessionsError } = await supabase
      .from('student_sessions')
      .select('id, student_id, profiles(name)')
      .eq('class_id', class_id);

    if (sessionsError) {
      return NextResponse.json({ success: false, error: sessionsError.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const sessionIds = sessions.map((s) => s.id);

    // 각 세션의 모든 상태 기록을 최신순으로 조회
    const { data: statuses, error: statusError } = await supabase
      .from('student_status')
      .select('session_id, checkpoint_id, status, source, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (statusError) {
      return NextResponse.json({ success: false, error: statusError.message }, { status: 500 });
    }

    // 세션 ID → { student_id, student_name } Map 생성
    const sessionMap = new Map(
      sessions.map((s) => [
        s.id,
        {
          student_id: s.student_id,
          student_name: Array.isArray(s.profiles)
            ? ((s.profiles[0] as { name: string })?.name ?? '알 수 없음')
            : ((s.profiles as { name: string } | null)?.name ?? '알 수 없음'),
        },
      ])
    );

    // 세션별 최신 상태 한 건만 추출 (이미 created_at DESC 정렬됨)
    const seenSessions = new Set<string>();
    const latestStatuses = (statuses ?? [])
      .filter((s) => {
        if (seenSessions.has(s.session_id)) return false;
        seenSessions.add(s.session_id);
        return true;
      })
      .map((s) => {
        const info = sessionMap.get(s.session_id);
        return {
          student_id: info?.student_id ?? null,
          student_name: info?.student_name ?? '알 수 없음',
          checkpoint_id: s.checkpoint_id,
          status: s.status,
          source: s.source,
          created_at: s.created_at,
        };
      });

    return NextResponse.json({ success: true, data: latestStatuses });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
