-- =============================================
-- SyncEdu 초기 DB 스키마
-- =============================================

-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 수업 테이블
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 체크포인트 테이블
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 학생 세션 테이블
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

-- 학생 상태 테이블
CREATE TABLE IF NOT EXISTS student_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('understanding', 'confused', 'stuck')),
  source TEXT NOT NULL CHECK (source IN ('manual', 'auto_idle', 'auto_error', 'auto_delay')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 체크포인트 진도 테이블
CREATE TABLE IF NOT EXISTS checkpoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (session_id, checkpoint_id)
);

-- AI 인터랙션 테이블
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hint', 'challenge', 'question_suggest', 'report')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 심화 챌린지 테이블
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  problem TEXT NOT NULL,
  student_answer TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Supabase Realtime 활성화
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE student_status;
ALTER PUBLICATION supabase_realtime ADD TABLE checkpoint_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;

-- =============================================
-- RLS 활성화
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS 정책 (MVP 간소화 버전)
-- =============================================

-- profiles: 본인 프로필 읽기/수정, 회원가입 시 insert
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- classes: 인증된 사용자 읽기 가능, instructor만 생성/수정
CREATE POLICY "classes_select" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes_insert" ON classes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "classes_update" ON classes FOR UPDATE TO authenticated
  USING (auth.uid() = instructor_id);

-- checkpoints: 인증된 사용자 읽기 가능, 해당 수업 instructor만 쓰기
CREATE POLICY "checkpoints_select" ON checkpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "checkpoints_insert" ON checkpoints FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND instructor_id = auth.uid())
  );
CREATE POLICY "checkpoints_update" ON checkpoints FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND instructor_id = auth.uid())
  );
CREATE POLICY "checkpoints_delete" ON checkpoints FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND instructor_id = auth.uid())
  );

-- student_sessions: 인증된 사용자 읽기 가능, 본인만 입장
CREATE POLICY "sessions_select" ON student_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_insert" ON student_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- student_status: 인증된 사용자 읽기 가능, 본인 세션만 쓰기
CREATE POLICY "status_select" ON student_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "status_insert" ON student_status FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM student_sessions WHERE id = session_id AND student_id = auth.uid())
  );

-- checkpoint_progress: 인증된 사용자 읽기 가능, 본인 세션만 쓰기
CREATE POLICY "progress_select" ON checkpoint_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_insert" ON checkpoint_progress FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM student_sessions WHERE id = session_id AND student_id = auth.uid())
  );
CREATE POLICY "progress_update" ON checkpoint_progress FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM student_sessions WHERE id = session_id AND student_id = auth.uid())
  );

-- ai_interactions: 관련 사용자만 읽기/쓰기
CREATE POLICY "ai_select" ON ai_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_insert" ON ai_interactions FOR INSERT TO authenticated WITH CHECK (true);

-- challenges: 관련 사용자만 읽기/쓰기
CREATE POLICY "challenges_select" ON challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "challenges_update" ON challenges FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM student_sessions WHERE id = session_id AND student_id = auth.uid())
  );
