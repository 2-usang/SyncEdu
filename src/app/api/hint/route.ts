import { createAdminClient } from '@/lib/supabase/admin';
import openai from '@/lib/openai';
import { HINT_SYSTEM_PROMPT } from '@/constants/prompts';
import { HintResponse, StudentStatus } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

/*
 * [curl 테스트 예시]
 *
 * POST — AI 힌트 생성 (코드/에러 없이)
 * curl -X POST http://localhost:3000/api/hint \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "checkpoint_id": "uuid-here",
 *     "student_status": "stuck"
 *   }'
 *
 * POST — AI 힌트 생성 (코드 + 에러 포함)
 * curl -X POST http://localhost:3000/api/hint \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "checkpoint_id": "uuid-here",
 *     "student_status": "confused",
 *     "student_code": "for i in range(10)\n  print(i)",
 *     "error_message": "SyntaxError: expected ':'",
 *     "session_id": "uuid-here"
 *   }'
 */

// 유효한 학생 상태 값 목록
const VALID_STATUSES: StudentStatus[] = ['understanding', 'confused', 'stuck'];

// POST — AI 힌트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkpoint_id, student_status, student_code, error_message, session_id } = body;

    // 필수 필드 검증
    if (!checkpoint_id || !student_status) {
      return NextResponse.json(
        { success: false, error: 'checkpoint_id, student_status는 필수입니다.' },
        { status: 400 }
      );
    }

    // 유효한 status 값 검증
    if (!VALID_STATUSES.includes(student_status)) {
      return NextResponse.json(
        {
          success: false,
          error: `student_status는 ${VALID_STATUSES.join(' | ')} 중 하나여야 합니다.`,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. 체크포인트 정보 조회
    const { data: checkpoint, error: checkpointError } = await supabase
      .from('checkpoints')
      .select('title, description')
      .eq('id', checkpoint_id)
      .single();

    if (checkpointError || !checkpoint) {
      return NextResponse.json(
        { success: false, error: '체크포인트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 사용자 메시지 구성
    const userMessageParts = [
      `현재 체크포인트: ${checkpoint.title} - ${checkpoint.description}`,
      `학생 상태: ${student_status}`,
    ];

    if (student_code) {
      userMessageParts.push(`학생 코드:\n\`\`\`\n${student_code}\n\`\`\``);
    }

    if (error_message) {
      userMessageParts.push(`에러 메시지: ${error_message}`);
    }

    const userMessage = userMessageParts.join('\n');

    // 3. OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: HINT_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // 4. JSON 파싱 시도 — 실패 시 hint에 원문 텍스트 삽입
    let hintData: HintResponse;
    try {
      // GPT가 ```json ... ``` 형태로 감쌀 경우 추출
      const jsonMatch =
        rawContent.match(/```json\s*([\s\S]*?)\s*```/) ?? rawContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : rawContent;
      const parsed = JSON.parse(jsonStr);

      hintData = {
        hint: parsed.hint ?? rawContent,
        prerequisite: parsed.prerequisite ?? null,
        suggested_question: parsed.suggested_question ?? '',
      };
    } catch {
      // JSON 파싱 실패 시 원문 텍스트를 hint에 담아 반환
      hintData = {
        hint: rawContent,
        prerequisite: null,
        suggested_question: '',
      };
    }

    // 5. ai_interactions 테이블에 로그 저장 (session_id는 optional)
    if (session_id) {
      await supabase.from('ai_interactions').insert({
        session_id,
        checkpoint_id,
        type: 'hint',
        prompt: userMessage,
        response: rawContent,
      });
      // 로그 저장 실패는 힌트 응답에 영향 없이 무시
    }

    return NextResponse.json({ success: true, data: hintData });
  } catch (err) {
    // OpenAI API 오류 등 구체적인 메시지 반환
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
