# SyncEdu 아키텍처 문서

## 전체 시스템 구조

```
┌──────────────────────────────────────────────────────┐
│                    Vercel (배포)                      │
│                                                      │
│  ┌─────────────────┐      ┌─────────────────────┐   │
│  │  강사 대시보드   │      │    학생 수업 화면    │   │
│  │ /instructor/    │      │    /student/         │   │
│  │ class/[id]/live │      │    class/[id]        │   │
│  └────────┬────────┘      └──────────┬──────────┘   │
│           │                          │               │
│  ┌────────▼──────────────────────────▼──────────┐   │
│  │              Next.js App Router               │   │
│  │          (Server + Client Components)         │   │
│  └──────────────────┬────────────────────────────┘   │
│                     │                                │
│  ┌──────────────────▼────────────────────────────┐   │
│  │              API Routes (/api/*)               │   │
│  │  hint / challenge / status / progress / report │   │
│  └──────┬───────────────────────────┬────────────┘   │
│         │                           │                │
└─────────┼───────────────────────────┼────────────────┘
          │                           │
┌─────────▼──────────┐   ┌───────────▼────────────┐
│   Supabase          │   │     OpenAI API          │
│  - PostgreSQL       │   │  - GPT-4o               │
│  - Auth             │   │  - 힌트 생성             │
│  - Realtime         │   │  - 챌린지 생성           │
└────────────────────┘   │  - 리포트 생성           │
                          └────────────────────────┘
```

## 데이터 흐름

### 학생 상태 입력 → 강사 대시보드 반영
```
학생 클라이언트
  │
  ├─ 수동: 이해됨/애매함/막힘 버튼 클릭
  │   └─ POST /api/status → student_status 테이블 INSERT
  │
  └─ 자동 감지 (예정):
      ├─ 5분 비활동 → confused (auto_idle)
      ├─ 에러 5회↑ → stuck (auto_error)
      └─ 예상 시간 2배 초과 → confused (auto_delay)

Supabase student_status 테이블
  └─ Realtime Change 이벤트 발행

강사 클라이언트
  └─ Realtime 구독 → 대시보드 즉시 업데이트
```

### 체크포인트 진도 흐름
```
학생 → POST /api/progress (started_at / completed_at)
     → checkpoint_progress 테이블 UPSERT
     → Realtime → 강사 대시보드 진도 바 업데이트
```

## API 라우트 목록

### POST /api/status
학생 이해도 상태를 기록합니다.

**요청:**
```json
{
  "session_id": "uuid",
  "checkpoint_id": "uuid",
  "status": "understanding | confused | stuck",
  "source": "manual | auto_idle | auto_error | auto_delay"
}
```

**응답:**
```json
{ "success": true, "id": "uuid" }
```

---

### POST /api/progress
체크포인트 시작/완료를 기록합니다.

**요청:**
```json
{
  "session_id": "uuid",
  "checkpoint_id": "uuid",
  "action": "start | complete"
}
```

**응답:**
```json
{ "success": true }
```

---

### POST /api/hint
AI가 막힌 학생에게 힌트를 생성합니다.

**요청:**
```json
{
  "checkpoint_id": "uuid",
  "student_status": "confused | stuck",
  "student_code": "string (optional)",
  "error_message": "string (optional)"
}
```

**응답:**
```json
{
  "hint": "힌트 내용",
  "prerequisite": "선행 개념 | null",
  "suggested_question": "강사에게 할 질문"
}
```

---

### POST /api/challenge
이해도가 높은 학생을 위한 심화 문제를 생성합니다.

**요청:**
```json
{ "checkpoint_id": "uuid" }
```

**응답:**
```json
{
  "problem": "문제 설명",
  "time_limit_minutes": 10,
  "hint": "힌트 (optional)"
}
```

---

### POST /api/question-suggest
학생이 강사에게 할 질문 문장을 생성합니다.

**요청:**
```json
{
  "checkpoint_id": "uuid",
  "student_status": "confused | stuck",
  "student_code": "string (optional)",
  "error_message": "string (optional)"
}
```

**응답:**
```json
{ "question": "질문 문장" }
```

---

### POST /api/report
수업 종료 후 리포트를 생성합니다.

**요청:**
```json
{
  "class_id": "uuid",
  "target": "instructor | student",
  "session_id": "uuid (student용)"
}
```

**응답:**
```json
{
  "summary": "수업 요약",
  "bottlenecks": [...],
  "recommendations": [...]
}
```

## 사용자별 접근 가능한 페이지

### Instructor (강사)
| 경로 | 설명 |
|------|------|
| `/instructor` | 내 수업 목록 |
| `/instructor/class/[id]/setup` | 수업 설정 (체크포인트 등록) |
| `/instructor/class/[id]/live` | 실시간 대시보드 |
| `/instructor/class/[id]/report` | 수업 후 리포트 |

### Student (수강생)
| 경로 | 설명 |
|------|------|
| `/student` | 수업 입장 (코드 입력) |
| `/student/class/[id]` | 수업 참여 화면 (에디터 + 상태 버튼) |
| `/student/class/[id]/report` | 수업 후 개인 리포트 |

### 공통
| 경로 | 설명 |
|------|------|
| `/login` | 로그인 |
| `/signup` | 회원가입 |

## Supabase Realtime 구독 구조

### 강사 대시보드 (`/instructor/class/[id]/live`)
```typescript
// 학생 상태 변화 구독
supabase
  .channel('class:{id}:status')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'student_status',
    filter: `session_id=in.(${sessionIds})`
  }, handler)
  .subscribe()

// 체크포인트 진도 구독
supabase
  .channel('class:{id}:progress')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'checkpoint_progress',
    filter: `session_id=in.(${sessionIds})`
  }, handler)
  .subscribe()

// 신규 학생 입장 구독
supabase
  .channel('class:{id}:sessions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'student_sessions',
    filter: `class_id=eq.{id}`
  }, handler)
  .subscribe()
```

### 학생 화면 (`/student/class/[id]`)
```typescript
// 수업 상태 변화 구독 (강사가 수업 시작/종료 시)
supabase
  .channel('session:{session_id}:class')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'classes',
    filter: `id=eq.{class_id}`
  }, handler)
  .subscribe()
```
