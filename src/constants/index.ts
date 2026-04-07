// 수업 코드 길이
export const CLASS_CODE_LENGTH = 6

// 자동 상태 감지 임계값 (초)
export const AUTO_IDLE_THRESHOLD_SECONDS = 300      // 5분 비활동 시 confused
export const AUTO_ERROR_THRESHOLD_COUNT = 5         // 5회 이상 에러 시 stuck
export const AUTO_DELAY_THRESHOLD_MULTIPLIER = 2    // 예상 시간 2배 초과 시 confused

// AI 응답 최대 토큰
export const HINT_MAX_TOKENS = 500
export const CHALLENGE_MAX_TOKENS = 800
export const QUESTION_SUGGEST_MAX_TOKENS = 200
export const REPORT_MAX_TOKENS = 2000

// Supabase Realtime 채널명 접두사
export const REALTIME_CLASS_CHANNEL = 'class:'
export const REALTIME_SESSION_CHANNEL = 'session:'
