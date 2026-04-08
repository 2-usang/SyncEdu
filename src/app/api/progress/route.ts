import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/supabase/api-auth';
import { NextRequest, NextResponse } from 'next/server';

/*
 * [curl 테스트 예시]
 *
 * POST — 체크포인트 시작 기록
 * curl -X POST http://localhost:3000/api/progress \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "session_id": "uuid-here",
 *     "checkpoint_id": "uuid-here"
 *   }'
 *
 * PATCH — 체크포인트 완료 기록
 * curl -X PATCH http://localhost:3000/api/progress \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "session_id": "uuid-here",
 *     "checkpoint_id": "uuid-here"
 *   }'
 *
 * GET — 수업 전체 진도 현황 조회
 * curl "http://localhost:3000/api/progress?class_id=uuid-here"
 */

// POST — 체크포인트 시작 기록 (중복이면 무시)
export async function POST(request: NextRequest) {
  try {
    // 인증 검증
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, checkpoint_id } = body;

    // 필수 필드 검증
    if (!session_id || !checkpoint_id) {
      return NextResponse.json(
        { success: false, error: 'session_id, checkpoint_id는 필수입니다.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // INSERT 시도 — unique(session_id, checkpoint_id) 제약 위반 시 무시
    const { data, error } = await supabase
      .from('checkpoint_progress')
      .insert({ session_id, checkpoint_id })
      .select()
      .single();

    // 중복 키 오류(23505)는 이미 시작된 것이므로 기존 레코드를 반환
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('checkpoint_progress')
          .select()
          .eq('session_id', session_id)
          .eq('checkpoint_id', checkpoint_id)
          .single();

        if (fetchError) {
          return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: existing });
      }

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

// PATCH — 체크포인트 완료 기록
export async function PATCH(request: NextRequest) {
  try {
    // 인증 검증
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, checkpoint_id } = body;

    // 필수 필드 검증
    if (!session_id || !checkpoint_id) {
      return NextResponse.json(
        { success: false, error: 'session_id, checkpoint_id는 필수입니다.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // completed_at을 현재 시각으로 업데이트
    const { data, error } = await supabase
      .from('checkpoint_progress')
      .update({ completed_at: new Date().toISOString() })
      .eq('session_id', session_id)
      .eq('checkpoint_id', checkpoint_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 업데이트 대상이 없으면 (아직 시작 기록이 없는 경우)
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: '해당 체크포인트 시작 기록이 없습니다. 먼저 POST로 시작을 기록해 주세요.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET — 특정 수업의 전체 체크포인트 진도 현황 조회
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

    // 해당 세션들의 체크포인트 진도 전체 조회
    const { data: progressList, error: progressError } = await supabase
      .from('checkpoint_progress')
      .select('session_id, checkpoint_id, started_at, completed_at')
      .in('session_id', sessionIds)
      .order('started_at', { ascending: true });

    if (progressError) {
      return NextResponse.json({ success: false, error: progressError.message }, { status: 500 });
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

    const data = (progressList ?? []).map((p) => {
      const info = sessionMap.get(p.session_id);
      return {
        student_id: info?.student_id ?? null,
        student_name: info?.student_name ?? '알 수 없음',
        checkpoint_id: p.checkpoint_id,
        started_at: p.started_at,
        completed_at: p.completed_at,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
