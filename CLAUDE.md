# SyncEdu — 프로젝트 규칙

## 프로젝트 개요

IT학원 실시간 수업 보조 시스템.
강사가 수업을 진행하는 동안 AI가 학생별 이해 병목을 감지하고 실시간 보조를 제공한다.
사용자 역할: instructor (강사), student (수강생)

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Realtime)
- OpenAI API (GPT-4o)
- Monaco Editor (코드 에디터)
- Recharts (차트)
- 배포: Vercel

## 폴더 구조

/src/app/student/ — 학생 전용 페이지
/src/app/instructor/ — 강사 전용 페이지
/src/app/api/ — API 라우트
/src/app/(auth)/ — 인증 페이지
/src/components/student/ — 학생 화면 컴포넌트
/src/components/instructor/ — 강사 화면 컴포넌트
/src/components/common/ — 공통 컴포넌트
/src/lib/ — Supabase, OpenAI, 유틸
/src/types/ — 타입 정의
/src/constants/ — 상수, 시스템 프롬프트

## 협업 규칙

- 팀원 3명이 태스크 단위로 작업을 나눠서 진행한다
- 작업 시작 전 팀 채널에 "나 지금 태스크 OO 시작한다" 공유 필수
- 같은 파일을 두 명이 동시에 수정하지 않는다
- 공유 파일 (types/index.ts, constants/, components/common/) 수정 시 팀 채널에 알림
- DB 테이블 구조 변경 시 팀 채널에 알림
- PR 머지 전 작업한 태스크 팀 채널에 공유

## 디자인 규칙

- 다크모드 기본
- Primary: #3B82F6 (파란색)
- Success/이해됨: #22C55E (초록)
- Warning/애매함: #EAB308 (노랑)
- Danger/막힘: #EF4444 (빨강)
- 폰트: Pretendard (한국어), Geist (영문)
- 컴포넌트: shadcn/ui 사용
- 아이콘: lucide-react
- 차트: recharts

## 코딩 컨벤션

- 컴포넌트 파일: PascalCase (예: StatusButton.tsx)
- 유틸/훅 파일: kebab-case (예: use-realtime.ts)
- API 라우트: /api/[기능]/route.ts
- 타입은 /src/types/index.ts에 중앙 관리
- 'use client'는 필요한 컴포넌트에만
- 주석은 한국어로
- console.log는 커밋 전 제거
- 코드 포맷팅은 Prettier가 관리한다. 코드 수정 후 및 커밋 전 `npm run format` 실행 필수.

## 중요 제약

- 다른 담당자의 폴더 직접 수정 금지
- 공유 파일 수정 시 팀 채널에 알림
- API Key 하드코딩 절대 금지, 환경변수만 사용
- DB 테이블 구조 변경은 C만 수행
