-- classes 테이블 Realtime 활성화
-- ClassRoom.tsx에서 current_checkpoint_order UPDATE 이벤트를 구독하므로 필요
ALTER PUBLICATION supabase_realtime ADD TABLE classes;

-- REPLICA IDENTITY FULL 설정
-- Supabase Realtime이 postgres_changes 이벤트 전달 전 RLS 검증 시
-- 행 데이터를 읽을 수 있어야 하므로 Realtime 구독 테이블 전체에 필요
ALTER TABLE classes REPLICA IDENTITY FULL;
ALTER TABLE student_status REPLICA IDENTITY FULL;
ALTER TABLE student_sessions REPLICA IDENTITY FULL;
