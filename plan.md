# 구현 계획

문서 상태: 구현 전 상세 계획  
작성일: 2026-07-02  
제품: 남성 컨템포러리 패션 쇼핑몰

## 1. 작업 목표

남성 컨템포러리 패션 쇼핑몰을 프론트엔드, 백엔드, 데이터베이스, 인증/권한, 관리자, 운영 관점에서 빠짐없이 구현하기 위한 계획을 정의한다. 구현자는 코드를 수정하기 전에 이 문서를 현재 작업 범위에 맞게 갱신하고, 진행 중 `process.md`를 계속 갱신한다.

### 1.0 챗봇 RAG/Agent 아키텍처 설계 및 문서 작성 (2026-07-03)

- 작업 목표: 쇼핑몰 챗봇 에이전트의 RAG/Agent 아키텍처 문서를 작성하고 `docs/shopping-mall-chatbot-rag-agent.md`에 저장한다.
- 구현 범위:
  - 현재 쇼핑몰 프로젝트 디렉토리 구조 및 코드 파악
  - 이미 존재하는 기능과 부재한 기능 분석
  - `docs/shopping-mall-chatbot-rag-agent.md` 파일 생성 (11가지 필수 항목 및 상세 가드레일 전략 포함)
- 제외 범위: 실제 챗봇 UI 및 RAG/Agent 백엔드/데이터베이스 연동 코드의 완전한 구현 (이 문서는 기획/설계 문서이다)
- 관련 요구사항 ID: FE-011 (챗봇 관련), NF-013, C-021.
- 주요 화면 또는 모듈: RAG Knowledge Base, Vector DB, Retrieval/Generation Pipeline, LLM Tools, Policy Layer, Guardrails.
- 데이터 모델 또는 상태 구조: 챗봇 대화 기록(Chat Session, Message) 및 챗봇 RAG 벡터 DB 스키마 제안.
- 구현 단계별 체크리스트:
  - [x] 현재 디렉토리 구조 및 관련 코드 위치 파악 (상품, 주문, 결제, 회원, API 등)
  - [x] 존재하는 기능과 아직 없는 기능 비교 분석
  - [x] 페르소나 4인(김도현, 박준서, 이태오, 최민재)의 요구사항을 반영한 챗봇 핵심 기능 설계
  - [x] 11개 대항목이 포함된 `docs/shopping-mall-chatbot-rag-agent.md` 작성
  - [x] 페르소나 에이전트 검토를 통한 피드백 반영
- 검증 방법: 설계 단계에서 마크다운 문서 품질 검토, 11개 필수 기획 항목 수록 여부 확인, 파일 경로 정합성 검사 (코드 미구현 상태로 실제 기능 작동 검증은 제외).
- 리스크와 대응: 기획 문서만 생성하므로 시스템 중단 리스크는 없으나, 실제 구현 가능성을 높이기 위해 현재 기술 스택(Prisma, Supabase Postgres/pgvector, Next.js 15)과 100% 매칭되는 구체적인 설계안을 작성한다.
- 미정 사항: RAG용 임베딩 모델(예: OpenAI text-embedding-3-small 등) 및 LLM 모델(예: Gemini 1.5 Pro/Flash 등)의 과금 및 API 호출 한도 정책.

### 1.0.2 챗봇 MVP 구현 (2026-07-03)

- 작업 목표: 설계 문서를 바탕으로 Tool-using Agent 형태의 1차 MVP 챗봇을 구현한다.
- 구현 범위:
  - `/api/chat` Route Handler (`web/src/app/api/chat/route.ts`): Vercel AI SDK를 적용하되, API 키가 없을 때의 안전한 Mock Fallback 에이전트 동작 지원.
  - Agent Tools 래퍼 (`web/src/lib/tools/productTools.ts`): `searchProducts`, `getProductDetail`, `checkStock`, `addToCart` 도구 구현.
  - 챗봇 UI 컴포넌트 (`web/src/components/chatbot/`): 플로팅 버튼, 채팅창, 메시지 리스트, 입력창, 상품 추천용 카드 컴포넌트 생성.
  - 전역 레이아웃 연결: 모든 페이지에서 우측 하단 챗봇이 보이도록 `web/src/app/layout.tsx`에 연동.
  - Guardrail 적용: 품절 상품 추천 제외, 주문/결제/개인정보 관련 요청 시 미구현 고지, 실패 시 고객센터/상담원 안내, 정책 외 단정 금지.
- 제외 범위: pgvector 기반 실시간 RAG 인덱싱 및 시맨틱 벡터 검색 구현, 주문/결제 및 개인정보 조회 관련 도구(Tool)의 실코드 구현.
- 관련 요구사항 ID: FE-011, NF-013, C-021.
- 주요 화면 또는 모듈: chatbot component, chat route API, product tools wrapper.
- 구현 단계별 체크리스트:
  - [x] Agent Tools 래퍼 작성 (`web/src/lib/tools/productTools.ts`)
  - [x] `/api/chat` Route Handler 작성 (`web/src/app/api/chat/route.ts`)
  - [x] 챗봇 UI 컴포넌트 작성 (`web/src/components/chatbot/` 하위 파일들)
  - [x] 전역 레이아웃에 챗봇 컴포넌트 탑재 (`web/src/app/layout.tsx`)
  - [x] 빌드 및 타입 체크 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 로컬 빌드 및 타입 체크 검사 통과 여부 확인, 코드의 Guardrails 규칙 준수 여부(품절 상품 처리, 미구현 안내 등) 정적 코드 검토.
- 리스크와 대응: API 키가 없어도 전체 기능(Mock 챗봇 모드)이 무너지지 않도록 안전한 Fallback 규칙 엔진을 연동한다.

### 1.0.3 챗봇 MVP에 Multi-Model Provider 선택 기능 추가 (2026-07-03)

- 작업 목표: 사용자가 사용할 LLM 모델(Gemini, Claude, SK A.X)을 챗봇 UI에서 선택하고, 서버 라우터를 통해 처리하는 어댑터 아키텍처를 구현한다.
- 구현 범위:
  - `ModelSelector` 컴포넌트 추가 및 챗봇 연동: `web/src/components/chatbot/ModelSelector.tsx`에 드롭다운 UI 추가. 선택된 `modelProvider`를 `/api/chat` 요청 body에 담아 송신.
  - `/api/chat` Route Handler 갱신 (`web/src/app/api/chat/route.ts`): 요청 body의 `modelProvider`를 받아 해당 클라이언트를 라우팅.
  - Provider Adapter & Router 구현: 
    - `web/src/lib/llm/providers/gemini.ts` (Gemini 어댑터)
    - `web/src/lib/llm/providers/claude.ts` (Claude 어댑터)
    - `web/src/lib/llm/providers/sk-ax.ts` (SK A.X 어댑터)
    - `web/src/lib/llm/router.ts` (환경변수 검증, Fallback 처리 및 응답 포맷 통일)
  - 설계 문서 갱신: [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)에 멀티모델 라우터, 어댑터 명세 및 에이전트(Classification, Answer, Refund)별 모델 적용 정책 기술.
  - 보안 및 비즈니스 가드레일 강화: API Key의 브라우저 노출 금지, 오류 메시지 원문 노출 차단, 환불 판정 고정 모델 정책(Answer Agent만 사용자 선택 모델 존중) 명세 및 가드레일 반영.
- 제외 범위: 미제공 외부 API의 실제 상용 호출 결제 처리 및 pgvector 통합.
- 관련 요구사항 ID: FE-011, NF-013, C-021.
- 주요 화면 또는 모듈: ModelSelector component, LLM Providers, Router.
- 구현 단계별 체크리스트:
  - [x] Multi-Model Provider & Router 구현 (`web/src/lib/llm/` 폴더 내 어댑터 및 `router.ts`)
  - [x] 챗봇 UI 모델 선택 드롭다운 탑재 (`web/src/components/chatbot/ModelSelector.tsx` 및 `ChatBot.tsx` 연동)
  - [x] `/api/chat` Route Handler에 `modelProvider` 분기 처리 적용
  - [x] 설계 문서 [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)에 멀티모델 관련 아키텍처 및 정책 갱신
  - [x] 타입체크 및 빌드 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 로컬 빌드 및 타입 체크 검사 통과 여부 확인, API Key 비노출 검증 및 Fallback 에러 안내 문구의 정상 반환 여부 확인.
- 리스크와 대응: 특정 모델 Provider API 호출 실패 시, 오류 원본을 숨기고 정제된 에러 안내문("현재 선택한 AI 모델을 사용할 수 없습니다...")이 반환되도록 Router 단에서 try-catch 및 default fallback(Gemini)을 구현한다.

### 1.0.4 SK A.X 환경변수 옵셔널 정책 보완 (2026-07-03)

- 작업 목표: `SK_AX_BASE_URL` 환경변수를 선택(Optional)으로 변경하고 누락 시 안전하게 예외 차단 및 안내 문구를 반환하도록 수정한다.
- 구현 범위:
  - `web/.env.example` 생성: `SK_AX_BASE_URL`을 optional로 명시하고 가이드 작성 및 `OPENAI_API_KEY` 예시 추가.
  - `sk-ax.ts` (`web/src/lib/llm/providers/sk-ax.ts`) 수정: `SK_AX_BASE_URL` 누락 시 즉각 전용 경고 로그와 함께unavailable 피드백 리턴.
  - `router.ts` (`web/src/lib/llm/router.ts`) 수정: `sk_ax` 라우팅 전에 `SK_AX_API_KEY`와 `SK_AX_BASE_URL` 유효성을 사전 교차 검증하여 unavailable 결과 조기 리턴.
  - API Route Handler (`web/src/app/api/chat/route.ts`) 수정: API Route 자체에서도 `sk_ax`인 경우 두 변수가 모두 존재할 때만 API를 호출하도록 2중 검증 이식.
  - `ModelSelector.tsx` 수정: 드롭다운 옵션 라벨을 `SK A.X (설정 필요)`로 수정하여 직관적 UX 제공.
- 구현 단계별 체크리스트:
  - [x] `web/.env.example` 생성 및 optional 주석 기술
  - [x] `sk-ax.ts` 수정: URL 누락 시 warn 로그 기록 및 전용 unavailability 메시지 반환
  - [x] `router.ts` 수정: API Key 및 Base URL 사전 교차 검증 구현
  - [x] Route Handler (`route.ts`) 수정: route 레벨의 key/url 존재 유무 2중 확인 및 에러 메시지 매핑
  - [x] UI `ModelSelector.tsx` 갱신: 드롭다운 표시명을 `SK A.X (설정 필요)`로 보정
  - [x] 타입체크 및 빌드 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 로컬 빌드 성공 여부 검사, 로깅 시 API Key 노출 전무 확인, 지정 안내 문구 매칭 검증.

### 1.0.5 OpenAI Provider 선택 기능 추가 (2026-07-03)

- 작업 목표: 챗봇에 OpenAI(gpt-4o-mini 고정) Provider 선택 옵션을 추가하고 라우터/어댑터를 구현한다.
- 구현 범위:
  - `openai.ts` (`web/src/lib/llm/providers/openai.ts`) 생성: `gpt-4o-mini` 모델명 상수화 및 API Key 검증, HTTP POST 어댑터 구현.
  - `router.ts` (`web/src/lib/llm/router.ts`) 수정: `openai` 라우팅 분기 추가 및 API Key 사전 검증.
  - API Route Handler (`route.ts`) 수정: `modelProvider === "openai"` 인자 검사 및 비인가 provider 차단/gemini 강제 필터 추가.
  - UI `ModelSelector.tsx` 갱신: 드롭다운 옵션에 `OpenAI` 추가.
  - `.env.example` 갱신: Required/Optional 주석 설명 명기 및 OpenAI 관련 환경변수 예시 추가.
  - 아키텍처 문서 [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md) 수정: Mermaid, 요약표, 에이전트별 환불/취소 차단 가드레일에 OpenAI 정책 추가 수록.
- 구현 단계별 체크리스트:
  - [x] OpenAI 어댑터 `openai.ts` 작성 및 모델명 상수화
  - [x] LLM Router `router.ts`에 openai 분기 및 사전 차단 로직 추가
  - [x] Route Handler (`route.ts`) 검증 보완 및 화이트리스트 차단 추가
  - [x] 드롭다운 `ModelSelector.tsx`에 OpenAI 옵션 탑재
  - [x] `.env.example` 및 아키텍처 명세서 수정 반영
  - [x] 타입체크 및 빌드 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 타입체크/빌드 성공 여부 검사, API Key 비노출 및 unavailable 지정 에러 응답 매칭 검토.

### 1.0.6 챗봇 MVP2 Multi-Agent Orchestration 설계 및 구현 (2026-07-03)

- 작업 목표: Classification Agent, Answer Agent, Refund Decision Agent 3개 에이전트 구조의 명시적 Orchestrator와 Trace 모니터링 뷰어를 구현한다.
- 구현 범위:
  - 3개 Agent 모듈 및 프롬프트 정의:
    - `web/src/lib/agents/prompts.ts` (프롬프트 템플릿 통합 관리)
    - `web/src/lib/agents/classificationAgent.ts` (의도 분류)
    - `web/src/lib/agents/answerAgent.ts` (고객 선택 LLM 자연어 답변)
    - `web/src/lib/agents/refundDecisionAgent.ts` (환불 차단 및 조력)
  - Orchestrator 및 Trace 모듈 구현:
    - `web/src/lib/agents/orchestrator.ts` (순차 에이전트 라우팅 및 SK A.X 모드 분기)
    - `web/src/lib/agents/trace.ts` (개인정보 마스킹 및 메모리 상의 Trace 이력 관리)
  - API Route Handler (`web/src/app/api/chat/route.ts`) 갱신: Orchestrator와 연동해 다중 에이전트 흐름 연계
  - Trace HTML Viewer 페이지 구현:
    - 파일 경로: [`web/src/app/admin/agent-traces/page.tsx`](file:///Users/6_month/sk-project/web/src/app/admin/agent-traces/page.tsx)
    - 브라우저 접근 경로: `/admin/agent-traces` (ADMIN_TRACE_VIEWER_ENABLED=true 또는 개발모드에서만 허용 가드 적용)
  - 설계 문서 갱신: [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)에 Agent 명세 표 및 403 Forbidden 보안 가드 정책 추가.
  - SK A.X 모드 환경변수 지원: `AGENT_MODEL_MODE` (normal | sk_only | sk_classification_test) 이식.
- 제외 범위: 실제 Trace DB 영구 테이블 마이그레이션(메모리 캐시로 대체), pgvector RAG 동기화 파이프라인 실코드.
- 관련 요구사항 ID: FE-011, NF-013, C-021.
- 주요 화면 또는 모듈: Agent Orchestrator, Trace Viewer page, admin page.
- 구현 단계별 체크리스트:
  - [x] 에이전트별 prompt 및 모듈 정의 (`web/src/lib/agents/` 내 prompts, classification, answer, refund)
  - [x] Trace 구조체 정의 및 수집기 구현 (`web/src/lib/agents/trace.ts` 메모리 기반 수집 및 개인정보 마스킹)
  - [x] Orchestrator 작성 (`web/src/lib/agents/orchestrator.ts` 및 `AGENT_MODEL_MODE` 바인딩)
  - [x] API Route Handler `/api/chat` 과 Orchestrator 흐름 통합
  - [x] Trace HTML Viewer 생성 (`web/src/app/admin/agent-traces/page.tsx` 마운트)
  - [x] 아키텍처 문서 [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md) 갱신
  - [x] 타입체크 및 빌드 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 로컬 빌드 성공 검사, admin/agent-traces 페이지 접속 가능성 검증, mock data 생성 및 trace timelines 렌더링 확인.

### 1.0.7 챗봇 LLM 연결 상태 진단 및 에러 마스킹 강화 (2026-07-03)

- 작업 목표: Gemini, Claude, SK A.X, OpenAI 등 멀티 모델 연결 실태를 진단하고 에러 전파 및 마스킹을 강화하며 헬스체크 API를 구축한다.
- 구현 범위:
  - 헬스체크 API 생성: `web/src/app/api/admin/llm-health/route.ts` (보안 가드 403 Forbidden 및 API 키 마스킹 포함)
  - 모델 상수화: `web/src/lib/llm/constants.ts` 신설
  - 어댑터별 환경변수 분리 및 에러 세분화:
    - Gemini: `GEMINI_MODEL` 바인딩 및 API_KEY_INVALID 등 에러 분류
    - Claude: `ANTHROPIC_MODEL` 바인딩 및 API_KEY_INVALID 등 에러 분류
    - SK A.X: `SK_AX_MODEL` 및 `SK_AX_CHAT_PATH` 바인딩 및 에러 분류
    - OpenAI: `OPENAI_MODEL` 바인딩 및 에러 분류
  - 챗봇 에러 UX 개선: 모델 실패 시 OpenAI 재시도 권유 멘트로 마스킹 강화
  - Trace 에러 로깅: `trace.ts` 및 `orchestrator.ts`에 `errorCode`, `modelUsed` 로깅 연동
  - 문서 및 설정 파일 반영: `.env.example`, 아키텍처 문서, plan/process.md
- 제외 범위: 운영 환경에서의 API Key 및 raw error 노출
- 관련 요구사항 ID: FE-011, NF-013, C-021
- 구현 단계별 체크리스트:
  - [x] 모델 기본값 상수화 (`web/src/lib/llm/constants.ts` 생성)
  - [x] Provider 어댑터(Gemini, Claude, SK A.X, OpenAI) 환경변수 바인딩 및 에러 코드 분류 개정
  - [x] Router 및 에러 문구 개선 (`router.ts` 수정)
  - [x] Trace 디버깅용 errorCode, modelUsed 필드 이식 및 오케스트레이터 연계 (`trace.ts`, `orchestrator.ts` 수정)
  - [x] 헬스체크 API 개설 (`web/src/app/api/admin/llm-health/route.ts` 작성)
  - [x] `.env.example` 및 아키텍처 문서 갱신
  - [x] 타입체크 및 빌드 검증 (`npm run typecheck --prefix web` 및 `npm run build --prefix web`)
- 검증 방법: 헬스체크 API 호출, 타입체크 및 프로덕션 빌드 성공 여부 검사.

### 1.1 Image Worker 1 하의 이미지 생성 작업 목표 (2026-07-03)

- 작업 목표: 요청된 하의 누락 이미지 4개를 생성한다.
- 구현 범위:
  - `menswear_demo_assets/bottoms/bottom_07/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/lookbook_image.png`
- 제외 범위: 위 4개 외 모든 PNG, 메타데이터, 프롬프트 문서, 앱 코드, zip 파일 생성/수정.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008, NF-002.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 프롬프트 문서 확인
  - [x] 대상 4개 PNG가 현재 존재하지 않음을 확인
  - [x] `bottom_07`, `bottom_10`의 `metadata.json` 확인
  - [x] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [x] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 검사
  - [x] 실패 시 최대 3회까지 재생성
  - [x] 최종 PNG를 지정 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부 기록.
- 리스크와 대응: built-in image generation이 실패하거나 시각 규칙 위반이 3회 반복되면 placeholder를 만들지 않고 실패로 보고한다. 다른 워커 산출물과 zip 파일은 건드리지 않는다.
- 미정 사항: 없음.

### 1.1.1 Image Worker 3 하의 이미지 생성 작업 목표 (2026-07-03)

- 작업 목표: `bottom_13`, `bottom_14`의 누락된 하의 이미지 6개를 생성한다.
- 구현 범위:
  - `menswear_demo_assets/bottoms/bottom_13/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_13/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_13/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/lookbook_image.png`
- 제외 범위: 위 6개 PNG 외 모든 파일, 다른 상품 폴더, 메타데이터/프롬프트 문서 수정, zip 파일 생성/수정, placeholder 생성.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 프롬프트 문서 확인
  - [x] 대상 6개 PNG가 현재 존재하지 않음을 확인
  - [x] `bottom_13`, `bottom_14`의 `metadata.json` 확인
  - [x] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [x] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 검사
  - [x] 실패 시 최대 3회까지 재생성
  - [x] 최종 PNG를 지정 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부 기록.
- 리스크와 대응: built-in image generation이 실패하거나 시각 규칙 위반이 3회 반복되면 placeholder를 만들지 않고 실패로 보고한다. 다른 워커 산출물과 zip 파일은 건드리지 않는다.
- 미정 사항: 없음.

### 1.1.2 Image Worker 4 하의 이미지 생성 작업 목표 (2026-07-03)

- 작업 목표: `bottom_15`, `bottom_16`, `bottom_17`의 누락된 하의 이미지 9개를 생성한다.
- 구현 범위:
  - `menswear_demo_assets/bottoms/bottom_15/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_15/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_15/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/lookbook_image.png`
- 제외 범위: 위 9개 PNG 외 모든 파일, 다른 상품 폴더, 메타데이터/프롬프트 문서 수정, zip 파일 생성/수정, placeholder 생성.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008, NF-002.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 프롬프트 문서 확인
  - [x] 대상 9개 PNG가 현재 존재하지 않음을 확인
  - [x] `bottom_15`, `bottom_16`, `bottom_17`의 `metadata.json` 확인
  - [x] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [x] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 검사
  - [x] 실패 시 최대 3회까지 재생성
  - [x] 최종 PNG를 지정 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부 기록.
- 리스크와 대응: built-in image generation이 실패하거나 시각 규칙 위반이 3회 반복되면 placeholder를 만들지 않고 실패로 보고한다. 다른 워커 산출물과 zip 파일은 건드리지 않는다.
- 미정 사항: 없음.

### 1.1.3 Image Worker 5 하의 이미지 생성 작업 목표 (2026-07-03)

- 작업 목표: `bottom_18`, `bottom_19`, `bottom_20`의 누락된 하의 이미지 9개를 생성한다.
- 구현 범위:
  - `menswear_demo_assets/bottoms/bottom_18/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_18/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_18/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/lookbook_image.png`
- 제외 범위: 위 9개 PNG 외 모든 파일, 다른 상품 폴더, 메타데이터/프롬프트 문서 수정, zip 파일 생성/수정, placeholder 생성.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008, NF-002.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 생성 스킬 지침 확인
  - [x] 대상 9개 PNG가 현재 존재하지 않음을 확인
  - [x] `bottom_18`, `bottom_19`, `bottom_20`의 `metadata.json` 확인
  - [x] `image_generation_prompts.json`에서 대상 9개 exact prompt 확인
  - [x] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [x] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 검사
  - [x] 실패 시 같은 정확 프롬프트로 최대 3회까지 재생성
  - [x] 최종 PNG를 `metadata.json`의 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부와 재생성 횟수 기록.
- 리스크와 대응: built-in image generation 결과에서 엄격 시각 규칙 위반이 확인되면 저장하지 않고 같은 exact prompt로 재생성한다. 3회 내 통과하지 못하거나 복사/저장이 불확실하면 placeholder 없이 실패로 보고한다. 다른 워커 산출물과 zip 파일은 건드리지 않는다.
- 미정 사항: 없음.

### 1.2 Worker B 이미지 생성 작업 목표

- 작업 목표: `menswear_demo_assets/tops/top_07`부터 `top_10`까지 누락된 상품 이미지 12개를 생성한다.
- 구현 범위: 각 상품 폴더의 `detail_image.png`, `worn_image.png`, `lookbook_image.png`만 생성한다.
- 제외 범위: 다른 상품 폴더, 메타데이터 구조, 프롬프트 문구, zip 패키지 재생성, 앱 코드 변경은 제외한다.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [ ] 필수 제품 문서와 이미지 프롬프트 문서 확인
  - [ ] `top_07`~`top_10`의 `metadata.json` 확인
  - [ ] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [ ] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 그래픽 심볼 여부 검사
  - [ ] 실패 시 최대 3회까지 재생성
  - [ ] 최종 PNG를 `metadata.json`의 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부 기록.
- 리스크와 대응: built-in image generation이 실패하면 placeholder를 만들지 않고 실패로 보고한다. 시각 규칙 위반이 확인되면 같은 정확 프롬프트로 최대 3회 재생성한다.
- 미정 사항: 없음.

### 1.3 Worker A 이미지 생성 작업 목표

- 작업 목표: `menswear_demo_assets/tops/top_03`부터 `top_06`까지 누락된 상품 이미지 12개를 생성한다.
- 구현 범위: 각 상품 폴더의 `detail_image.png`, `worn_image.png`, `lookbook_image.png`만 생성한다.
- 제외 범위: `top_01`, `top_02`, `top_07` 이후, `bottoms/*`, 메타데이터 구조, 프롬프트 문구, zip 패키지 재생성, 앱 코드 변경, placeholder 이미지 생성은 제외한다.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008, A-006, NF-002.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `image_generation_prompts.json`의 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 프롬프트 문서 확인
  - [x] `top_03`~`top_06`의 `metadata.json` 확인
  - [ ] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [ ] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 그래픽 심볼 여부 검사
  - [ ] 실패 시 최대 3회까지 재생성
  - [ ] 최종 PNG를 `metadata.json`의 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부 기록.
- 리스크와 대응: built-in image generation이 실패하면 placeholder를 만들지 않고 실패로 보고한다. 시각 규칙 위반이 확인되면 같은 정확 프롬프트로 최대 3회 재생성한다.
- 미정 사항: 없음.

### 1.4 웹 애플리케이션 1차 구현 (2026-07-02 착수)

- 작업 목표: `web/` 디렉토리에 고객 구매 흐름 중심의 쇼핑몰 웹 앱을 백엔드부터 프론트까지 구현한다.
- 확정한 기술 스택:
  - 프레임워크: Next.js 15 (App Router) + TypeScript — 프론트와 백엔드(Route Handler)를 한 코드베이스로 관리
  - 스타일: Tailwind CSS v4 — `docs/design-instruct.md`와 `menswear_demo_assets/docs/brand_direction.md` 기반 디자인 토큰 정의
  - DB: SQLite + Prisma — 데모 규모(40 SKU)에 적합, 마이그레이션 관리 충족(DB-002)
  - 인증: DB 세션 테이블 + httpOnly 쿠키(세션 기반으로 확정), bcryptjs 해시(BE-005)
  - 결제: PG 미연동 상태이므로 모의 결제(주문 생성 트랜잭션에서 재고 차감·Payment 레코드 생성). 실 PG 연동은 1차 제외 범위 유지
- 이미지 서빙 전략(이미지 생성이 진행 중이므로):
  - `menswear_demo_assets/` 원본 디렉토리를 복사하지 않고 `/api/assets/[...path]` 라우트로 직접 서빙 → 워커가 이미지를 추가하면 재빌드 없이 즉시 반영
  - DB에는 `manifest.json`의 안정 상대 경로(`tops/top_01/detail_image.png` 등)만 저장
  - 프론트에 `ProductImage` 폴백 컴포넌트: 이미지 404 시 상품 색상 기반 placeholder 표시
- 1차 구현 화면: 홈, 상품 목록(필터/정렬), 상품 상세(옵션/실측표/모델 착용/품절·재입고), 룩북 목록/상세(세트 담기), 장바구니, 주문서, 결제 결과, 로그인/회원가입, 마이페이지(주문), 관리자(주문/재고 최소 기능)
- 이번 회차 제외: 소셜 로그인, 비밀번호 재설정 메일 발송(토큰 구조만), 쿠폰/포인트 실사용, 리뷰/문의 작성, 교환/반품 요청 화면 — 다음 회차로 이월

### 1.5 홈페이지 및 주요 페이지 카피 개선 (2026-07-02 착수)

- 작업 목표: 홈페이지와 주요 페이지 내 부자연스러운 문구(카피)를 남성 컨템포러리 브랜드 감성(SLOWEON)에 맞게 세련되고 일관되게 개선한다.
- 구현 범위:
  - 홈 화면: "이번 주 신상품" -> "신규 입고", "고민 없이, 셋업" -> "여름의 유니폼" (설명문 정제), "오늘의 컨템포러리 룩" -> "시즌 에디토리얼", 재입고 예약 문구 톤 수정
  - 상품 페이지: 필터 결과 없음 안내문 톤 수정
  - 주문서 페이지: 비회원 로그인 권유 톤 수정
  - 룩북 페이지: 서브 카피 정제 및 상품 구성 영역 타이틀 정제
  - 컴포넌트: OptionSelector, OutfitForm 내 안내 톤 정제 및 "코디 세트" -> "착장 세트" 변경
- 제외 범위: 레이아웃 변경, 기능 로직 변경, 데이터 모델 변경 없음.
- 관련 요구사항 ID: FE-001, FE-004, FE-005, FE-007, FE-008.
- 구현 단계별 체크리스트:
  - [x] `web/src/app/page.tsx` 내 문구 수정 (신상품, 셋업, 오늘의 컨템포러리 룩, 재입고 안내)
  - [x] `web/src/app/checkout/page.tsx` 내 비회원 안내 문구 톤 수정
  - [x] `web/src/app/products/page.tsx` 내 필터 결과 없음 안내 톤 수정
  - [x] `web/src/components/OptionSelector.tsx` 및 `OutfitForm.tsx` 내 구어체 안내 및 "코디 세트" 표기 수정
  - [x] `web/src/app/lookbooks/page.tsx` 및 `web/src/app/lookbooks/[id]/page.tsx` 내 룩북 안내 카피 정제
  - [x] 수정 사항에 대해 로컬 빌드 및 타입 검사 (`npm run build` 또는 `tsc --noEmit`) 실행
  - [x] 3개 페르소나(김도현, 박준서, 이태오) 관점에서 카피가 컨템포러리 감성에 부합하는지 피드백 검토
- 검증 방법: 로컬 빌드 통과 여부 및 UI 레이아웃 깨짐 검사.
- 리스크와 대응: UI 텍스트만 정밀 수정하되, 로직/폼 제출 관련 `name` 속성이나 `value`가 훼손되지 않도록 주의한다.

### 1.6 Vercel 배포를 위한 자산 구조 및 DB Provider 전환 (2026-07-02 착수)

- 작업 목표: 버셀(Vercel) 서버리스 배포를 위해 이미지 파일 서빙 문제를 해결하고 데이터베이스를 SQLite에서 PostgreSQL로 설정 전환한다.
- 구현 범위:
  - 이미지 자산 이동: `menswear_demo_assets` 및 `overview-image` 폴더를 `web/public/` 하위로 이동하여 빌드 번들 내에 적정 자산으로 동봉.
  - 경로 설정 수정: `web/src/lib/assets.ts` 내의 ASSETS_ROOT 및 OVERVIEW_ROOT 경로를 `web/public` 폴더 아래를 지칭하도록 수정.
  - DB Provider 전환: `web/prisma/schema.prisma` 내 database provider를 `sqlite`에서 `postgresql`로 수정.
- 구현 단계별 체크리스트:
  - [x] 최상위 폴더에 있는 이미지 자산 디렉토리 복사 (`mkdir -p web/public && cp -R menswear_demo_assets web/public/ && cp -R overview-image web/public/`)
  - [x] `web/src/lib/assets.ts` 내의 로컬 경로를 Next.js public 하위 참조로 수정
  - [x] `web/prisma/schema.prisma` 내 DB provider를 `postgresql`로 전환
  - [x] Prisma Client 로컬 재생성 (`npx prisma generate` in web) 및 빌드 검증
  - [x] 작업 내용 Git 스테이징, 커밋 및 Github origin에 푸시
- 검증 방법: 빌드 및 타입체크 성공 여부 검사.
- 리스크와 대응: 로컬 개발 환경에서 PostgreSQL 접속 정보(DATABASE_URL)가 필요해질 수 있으므로, 사용 방법 가이드를 유저에게 제공하여 원활한 로컬 시딩 및 연동을 유도한다.

### 1.7 토스페이먼츠 결제 연동 (2026-07-02 착수)

- 작업 목표: 주문서 결제 수단 선택 시 토스페이먼츠 PG사 결제창을 실제로 기동하고, 승인 성공 및 실패 시의 비즈니스 로직(재고 차감, 주문 확정, 쿠폰/포인트 소진)을 트랜잭션으로 안전하게 연동한다.
- 구현 범위:
  - `CheckoutForm` 클라이언트 폼 핸들러 개편: `@tosspayments/tosspayments-sdk`를 호출하여 결제 요청 연동.
  - 가주문 생성 로직(`prepareOrder` Server Action) 추가: 결제 요청 직전 임시 가주문(`status: PENDING`, `Payment status: READY`)을 안전하게 생성.
  - 결제 승인 콜백 API 핸들러 (`/api/payment/toss/success`) 개발: 토스페이먼츠 승인 요청 후 데이터베이스 트랜잭션(재고 차감, 쿠폰/포인트 사용, 상태 확정) 처리 및 예외 시 자동 취소(취소 API 호출) 구현.
  - 결제 실패 콜백 API 핸들러 (`/api/payment/toss/fail`) 및 실패 안내 화면 개발.
- 구현 단계별 체크리스트:
  - [x] 토스페이먼츠 클라이언트 패키지 설치 (`@tosspayments/tosspayments-sdk`)
  - [x] `web/src/app/actions/order.ts` 내 `prepareOrder` 액션 구현
  - [x] `web/src/components/CheckoutForm.tsx`에 토스페이먼츠 SDK 요청 로직 탑재 및 onSubmit 전환
  - [x] `/api/payment/toss/success` 성공 라우트 핸들러 개발 (승인 및 DB 트랜잭션 원자적 처리 및 자동 취소 롤백 보장)
  - [x] `/api/payment/toss/fail` 실패 라우트 핸들러 개발
  - [x] `/checkout/fail` 결제 실패 UI 페이지 개발
  - [x] 타입 검사 및 Next.js optimized 빌드 성공 확인
  - [x] 변경 사항 Git 스테이징, 커밋 및 Github origin 푸시
- 검증 방법: 로컬/버셀 환경 실결제 창 기동 검사 및 테스트 결제 후 DB 데이터 적재와 재고 감소 확인.
- 리스크와 대응: 결제 처리 중 꼬임(재고는 차감되었는데 PG 승인은 실패함 등)을 막기 위해, DB 반영 전에 PG 승인을 먼저 완료하고, DB 반영 실패 시 PG 자동 취소 API를 트리거하는 이중 검증 롤백 전략을 준수한다.

### 1.8 Image Worker 2 하의 이미지 생성 작업 목표 (2026-07-03)

- 작업 목표: `menswear_demo_assets/bottoms/bottom_11`과 `menswear_demo_assets/bottoms/bottom_12`에 누락된 상품 이미지 6개를 생성한다.
- 구현 범위: 각 상품 폴더의 `detail_image.png`, `worn_image.png`, `lookbook_image.png`만 생성한다.
- 제외 범위: 다른 상품 폴더, 기존 PNG 덮어쓰기, 메타데이터 구조 변경, 프롬프트 문구 변경, zip 파일 생성/수정, 앱 코드 변경, placeholder 이미지 생성은 제외한다.
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008, A-006, NF-002.
- 주요 화면 또는 모듈: 상품 상세 이미지, 착용컷, 룩북 이미지 데모 에셋.
- 데이터 모델 또는 상태 구조: 변경 없음. `metadata.json`의 이미지 경로와 `menswear_demo_assets/docs/image_generation_prompts.json`의 `bottom_11`, `bottom_12` 프롬프트를 그대로 사용한다.
- 구현 단계별 체크리스트:
  - [x] 필수 제품 문서와 이미지 생성 스킬 지침 확인
  - [x] `bottom_11`, `bottom_12`의 `metadata.json`과 누락 이미지 확인
  - [x] 각 이미지에 대해 `image_generation_prompts.json`의 정확한 프롬프트로 생성
  - [x] 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 검사
  - [x] 실패 시 같은 정확 프롬프트로 최대 3회까지 재생성
  - [x] 최종 PNG를 `metadata.json`의 경로에 저장
- 검증 방법: 파일 존재 여부와 PNG 형식 확인, 생성 이미지 육안 검사, 엄격 시각 규칙 위반 여부와 재생성 횟수 기록.
- 리스크와 대응: built-in image generation 결과에서 엄격 시각 규칙 위반이 확인되면 저장하지 않고 재생성한다. 3회 내 통과하지 못하거나 복사/저장이 불확실하면 placeholder 없이 실패로 보고한다.
- 미정 사항: 없음.


## 2. 기준 문서

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/customer-personas.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `.agents/README.md`
- `AGENTS.md`

## 3. 1차 구현 범위

### 3.1 고객 프론트엔드

- 홈
- 신상품/드롭
- 상품 목록
- 상품 검색/필터/정렬
- 상품 상세
- 색상/사이즈 옵션 선택
- 실측 사이즈표
- 모델 착용 정보
- 룩북/코디 세트
- 장바구니
- 주문서
- 결제 결과
- 로그인/회원가입/비밀번호 재설정
- 마이페이지
- 주문 상세
- 교환/반품 요청
- 재입고 알림

### 3.2 관리자 프론트엔드

- 관리자 로그인
- 관리자 대시보드
- 상품 관리
- 색상/사이즈 옵션 관리
- 재고 관리
- 사이즈표 관리
- 모델 착용 정보 관리
- 룩북/코디 세트 관리
- 주문/배송 관리
- 교환/반품 관리
- 회원/리뷰/문의 관리
- 재입고 알림 신청 현황
- 활동 로그

### 3.3 백엔드/API

- 인증 API
- 회원 API
- 상품/카테고리 API
- 상품 옵션/재고 API
- 룩북/코디 API
- 장바구니 API
- 주문/주문서 계산 API
- 결제 준비/검증 API
- 배송지/배송 API
- 쿠폰/포인트 API
- 재입고 알림 API
- 리뷰/문의 API
- 관리자 API
- 감사 로그 API

### 3.4 데이터베이스

- 사용자/세션/소셜 계정/인증 토큰
- 카테고리/상품/상품 이미지/상품 옵션
- 실측 사이즈표/모델 착용 정보
- 룩북/코디 세트
- 장바구니/찜/재입고 알림
- 배송지/주문/주문 상품/주문 상태 이력
- 결제/배송/교환/반품
- 쿠폰/회원 쿠폰/포인트 원장
- 리뷰/문의
- 재고 원장/관리자 감사 로그

## 4. 1차 제외 범위

- 실제 PG 실거래 결제 오픈
- AI 스타일 추천
- 입점사 관리
- 해외 배송
- 라이브커머스
- 오프라인 매장 재고 연동
- 네이티브 앱

## 5. 관련 요구사항

- CAT-001~CAT-005
- C-001~C-021
- P-001~P-008
- PD-001~PD-010
- O-001~O-010
- D-001~D-006
- M-001~M-006
- R-001~R-006
- A-001~A-015
- FE-001~FE-011
- BE-001~BE-012
- DB-001~DB-010
- NF-001~NF-013

## 6. 구현 체크리스트

### 6.1 구현 전 문서 확인

- [ ] `docs/shopping-mall-pyd.md` 확인
- [ ] `docs/shopping-mall-planning.md` 확인
- [ ] `docs/customer-personas.md` 확인
- [ ] `docs/information-architecture.md` 확인
- [ ] `docs/user-scenarios.md` 확인
- [ ] `.agents/README.md`와 관련 페르소나 에이전트 정의 확인
- [ ] 이번 작업 범위와 관련 요구사항 ID를 `process.md`에 기록

### 6.2 프로젝트 기반

- [ ] 기술 스택 확정
- [ ] 라우팅 구조 정의
- [ ] 고객/관리자 레이아웃 분리
- [ ] 환경 변수 구조 정의
- [ ] 공통 오류 응답 구조 정의
- [ ] 공통 폼 검증 방식 정의
- [ ] 서버 상태 캐싱/무효화 방식 정의
- [ ] 모바일 우선 스타일 기준 정의

### 6.3 인증/권한

- [ ] 회원가입 구현
- [ ] 이메일/휴대폰 중복 검증 구현
- [ ] 비밀번호 정책 구현
- [ ] 로그인 구현
- [ ] 로그아웃 구현
- [ ] 세션 또는 액세스/리프레시 토큰 갱신 구현
- [ ] 비밀번호 재설정 구현
- [ ] 로그인 실패 보호 구현
- [ ] 비회원 세션 구현
- [ ] 관리자 권한 검증 구현
- [ ] 보호 라우트와 보호 API 구현
- [ ] 관리자 2단계 인증 또는 IP 허용목록 구현 (A-015)

### 6.4 데이터베이스/마이그레이션

- [ ] 사용자, 세션, 소셜 계정, 인증 토큰 스키마
- [ ] 카테고리, 상품, 상품 이미지, 상품 옵션 스키마
- [ ] 실측 사이즈표, 모델 착용 정보 스키마
- [ ] 룩북, 코디 세트 스키마
- [ ] 장바구니, 찜, 재입고 알림 스키마
- [ ] 배송지, 주문, 주문 상품, 주문 상태 이력 스키마
- [ ] 결제, 배송, 교환/반품 스키마
- [ ] 쿠폰, 회원 쿠폰, 포인트 원장 스키마
- [ ] 리뷰, 문의 스키마
- [ ] 재고 원장, 관리자 감사 로그 스키마
- [ ] 외래키, 고유 제약, 인덱스 정의
- [ ] 초기 시드 데이터 작성

### 6.5 백엔드 도메인/API

- [ ] 인증/회원 API
- [ ] 상품 목록/상세/검색/필터 API
- [ ] 상품 옵션/재고 API
- [ ] 룩북/코디 세트 API
- [ ] 장바구니 API
- [ ] 주문서 금액 계산 API
- [ ] 주문 생성 API
- [ ] 결제 준비/승인 검증 API
- [ ] 결제 실패/취소/환불 API
- [ ] 배송지/배송 API
- [ ] 교환/반품 API
- [ ] 쿠폰/포인트 API
- [ ] 재입고 알림 API
- [ ] 리뷰/문의 API
- [ ] 관리자 API
- [ ] 감사 로그 기록
- [ ] 주문/결제/재고 트랜잭션 처리
- [ ] 멱등성 키 처리

### 6.6 고객 프론트엔드

- [ ] 홈 화면
- [ ] 신상품/드롭 화면
- [ ] 상품 목록
- [ ] 검색/필터/정렬
- [ ] 상품 상세
- [ ] 색상/사이즈 옵션 선택
- [ ] 실측 사이즈표
- [ ] 모델 착용 정보
- [ ] 룩북/코디 세트
- [ ] 장바구니
- [ ] 주문서
- [ ] 결제 결과
- [ ] 로그인/회원가입/비밀번호 재설정
- [ ] 마이페이지
- [ ] 주문 상세
- [ ] 교환/반품 요청
- [ ] 재입고 알림

### 6.7 관리자 프론트엔드

- [ ] 관리자 로그인
- [ ] 관리자 대시보드
- [ ] 상품 등록/수정
- [ ] 상품 이미지 관리
- [ ] 색상/사이즈 옵션 관리
- [ ] 재고 관리
- [ ] 사이즈표 관리
- [ ] 모델 착용 정보 관리
- [ ] 룩북/코디 관리
- [ ] 주문/배송 관리
- [ ] 교환/반품 관리
- [ ] 회원/리뷰/문의 관리
- [ ] 재입고 알림 신청 현황
- [ ] 관리자 활동 로그

### 6.8 검증

- [ ] 빌드 또는 타입 검사
- [ ] 단위 테스트
- [ ] API 통합 테스트
- [ ] 인증/권한 테스트
- [ ] 주문/결제/재고 트랜잭션 테스트
- [ ] 장바구니/주문서 금액 계산 테스트
- [ ] 모바일 화면 검증
- [ ] 관리자 권한별 접근 검증
- [ ] 주요 유저 시나리오 수동 검증

### 6.9 페르소나 피드백 게이트

- [ ] 디자인 단계에서 김도현, 박준서, 이태오, 최민재 관점의 화면 피드백 확인
- [ ] 개발 단계에서 최소 3개 페르소나의 핵심 시나리오 통과 여부 확인
- [ ] QA 단계에서 모바일 구매 흐름을 페르소나별로 점검
- [ ] 런칭 단계에서 4개 페르소나 전원의 릴리즈 차단 이슈 없음 확인
- [ ] 페르소나 피드백 결과를 `process.md`에 기록

## 7. 핵심 API 설계 대상

| 영역 | 대표 엔드포인트 |
|---|---|
| 인증 | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/password-reset` |
| 회원 | `GET /me`, `PATCH /me`, `GET /me/orders`, `GET /me/points`, `GET /me/coupons` |
| 상품 | `GET /products`, `GET /products/:id`, `GET /products/filters`, `GET /categories` |
| 룩북 | `GET /lookbooks`, `GET /lookbooks/:id`, `POST /cart/outfit` |
| 장바구니 | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id` |
| 주문 | `POST /checkout/quote`, `POST /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` |
| 결제 | `POST /payments/prepare`, `POST /payments/confirm`, `POST /payments/webhook`, `POST /payments/:id/cancel` |
| 배송 | `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id` |
| CS | `POST /orders/items/:id/exchange`, `POST /orders/items/:id/return`, `POST /inquiries` |
| 관리자 | `GET /admin/orders`, `POST /admin/products`, `PATCH /admin/variants/:id/stock`, `POST /admin/lookbooks` |

## 8. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 인증이 단순 구현되면 보안 취약점이 생김 | 세션/토큰 만료, 로그아웃 무효화, 비밀번호 해시, 실패 제한을 P0로 구현 |
| 데이터 모델이 약하면 주문/재고가 꼬임 | variant, inventory ledger, order snapshot, payment, status history를 초기 스키마에 포함 |
| 프론트만 먼저 만들면 API/DB와 어긋남 | 화면 구현 전 API 응답 구조와 데이터 모델을 확정 |
| 옵션/재고 구조가 단순하면 초과 판매 발생 | 색상+사이즈 조합 단위 재고와 동시성 제어 구현 |
| 모바일 옵션 선택이 불편하면 전환율 하락 | 하단 구매 영역 또는 명확한 옵션 선택 UI 적용 |
| 관리자 권한이 느슨하면 운영 사고 발생 | 관리자 권한 분리와 감사 로그 적용 |
| 페르소나 검토 없이 출시하면 실제 고객 문제를 놓침 | 디자인/개발/런칭 단계별 페르소나 피드백 게이트 적용 |

## 9. 미정 사항

- 실제 브랜드명 (데모 자산은 가상 브랜드 "SLOWEON" 기준으로 생성되어 있으나 이는 이미지 생성용 placeholder이며 공식 브랜드명 결정은 아님)
- 기술 스택
- 인증 방식: 세션 기반 또는 JWT/리프레시 토큰 기반
- PG사
- 배송사
- 초기 상품 데이터 수
- 관리자 기능의 1차 포함 범위
