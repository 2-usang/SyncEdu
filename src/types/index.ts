// 사용자 역할
export type UserRole = 'instructor' | 'student';

// 사용자
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

// 수업 상태
export type ClassStatus = 'draft' | 'live' | 'ended';

// 수업
export interface Class {
  id: string;
  instructor_id: string;
  title: string;
  class_code: string;
  status: ClassStatus;
  created_at: string;
}

// 체크포인트
export interface Checkpoint {
  id: string;
  class_id: string;
  order_num: number;
  title: string;
  description: string;
  estimated_minutes: number;
}

// 학생 이해도 상태
export type StudentStatus = 'understanding' | 'confused' | 'stuck';

// 상태 감지 방법
export type StatusSource = 'manual' | 'auto_idle' | 'auto_error' | 'auto_delay';

// 학생 상태 기록
export interface StudentStatusRecord {
  id: string;
  session_id: string;
  checkpoint_id: string;
  status: StudentStatus;
  source: StatusSource;
  created_at: string;
}

// 학생 세션
export interface StudentSession {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
}

// 체크포인트 진도
export interface CheckpointProgress {
  id: string;
  session_id: string;
  checkpoint_id: string;
  started_at: string;
  completed_at: string | null;
}

// AI 인터랙션 타입
export type AIInteractionType = 'hint' | 'challenge' | 'question_suggest' | 'report';

// AI 인터랙션 기록
export interface AIInteraction {
  id: string;
  session_id: string;
  checkpoint_id: string;
  type: AIInteractionType;
  prompt: string;
  response: string;
  created_at: string;
}

// 심화 챌린지
export interface Challenge {
  id: string;
  session_id: string;
  checkpoint_id: string;
  problem: string;
  student_answer: string | null;
  ai_feedback: string | null;
  created_at: string;
}

// 힌트 요청
export interface HintRequest {
  checkpoint_id: string;
  student_status: StudentStatus;
  student_code?: string;
  error_message?: string;
}

// 힌트 응답
export interface HintResponse {
  hint: string;
  prerequisite: string | null;
  suggested_question: string;
}

// 챌린지 요청
export interface ChallengeRequest {
  checkpoint_id: string;
}

// 챌린지 응답
export interface ChallengeResponse {
  problem: string;
  time_limit_minutes: number;
  hint?: string;
}

// 강사 대시보드 요약
export interface DashboardSummary {
  total_students: number;
  understanding_count: number;
  confused_count: number;
  stuck_count: number;
}

// 병목 항목
export interface BottleneckItem {
  checkpoint_id: string;
  checkpoint_title: string;
  stuck_count: number;
  confused_count: number;
}
