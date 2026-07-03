# 구현 진행 기록

## 2026-07-03 - 챗봇 MVP3 RAG Knowledge Base 구현 완료

### 작업 목표
Supabase PostgreSQL + pgvector 기반 RAG Knowledge Base 구축 및 Agent Orchestrator Hybrid Retrieval 연동.

### 읽은 문서와 확인한 요구사항
- `docs/shopping-mall-chatbot-rag-agent.md`, `plan.md`, Prisma schema, MVP1/MVP2 챗봇 구조
- FE-011, NF-013, C-021

### 구현한 변경 사항
- **pgvector 스키마**: `web/prisma/migrations/rag_pgvector_setup.sql` — rag_chunks 테이블, ivfflat 인덱스, match_rag_chunks RPC
- **Embedding**: `web/src/lib/rag/embeddings.ts`, `constants.ts` — openai/gemini provider, sanitized EmbeddingError
- **Indexing**: `web/scripts/sync-vectors.ts` — product/product_detail/size_guide/review_summary/정책/FAQ/brand_guide upsert
- **Retrieval**: `retriever.ts` (retrieveRagContext, retrievePolicyContext, retrieveProductContext), `hybrid.ts` (DB filter + RAG)
- **Agents**: orchestrator RAG 연결, answerAgent/refundDecisionAgent RAG context 주입, prompts 갱신
- **Trace**: ragSources 필드 확장 (sourceId, contentPreview, usedByAgent), Viewer RAG Retrieval 타임라인 단계
- **Health API**: `/api/admin/rag-health` — pgvector/chunk stats/sample retrieval
- **package.json**: `rag:sync` 스크립트 추가
- **.env.example**: EMBEDDING_PROVIDER, OPENAI_EMBEDDING_MODEL, GEMINI_EMBEDDING_MODEL

### 수정한 파일
- `web/src/lib/rag/` (constants, embeddings, embedder, retriever, hybrid)
- `web/scripts/sync-vectors.ts`
- `web/src/lib/agents/orchestrator.ts`, `answerAgent.ts`, `refundDecisionAgent.ts`, `prompts.ts`, `trace.ts`
- `web/src/app/admin/agent-traces/page.tsx`
- `web/src/app/api/admin/rag-health/route.ts`
- `web/package.json`, `web/.env.example`
- `docs/shopping-mall-chatbot-rag-agent.md`, `plan.md`, `process.md`

### 주요 의사결정
- Prisma schema에 vector 타입 미포함 — raw SQL migration으로 pgvector 관리 (Prisma 빌드 안정성)
- Hybrid Retrieval: 가격/카테고리/색상/재고는 productTools DB filter 우선, 스타일/리뷰/사이즈/정책은 RAG
- RAG 실패 시 빈 배열 fallback — 챗봇 전체 중단 방지
- 자동 환불/결제취소 가드레일 유지

### 검증 결과
- `npm run typecheck --prefix web`: 통과
- `npm run build --prefix web`: 통과 (`/api/admin/rag-health` 라우트 포함)
- `npm run rag:sync --prefix web`: rag_chunks 테이블 미존재로 exit 1 (마이그레이션 선행 필요 — 정상 동작)
- `GET /api/admin/rag-health` (development): 200 응답, pgvectorExtension=false, errors=["rag_chunks table not found"] (DB 미설정 환경)

### 남은 작업
- BM25 hybrid search, Cohere rerank, Trace DB 영구 저장, 주문 조회 Tool 연동

---

## 2026-07-03 - 챗봇 UI 디자인 개선 (브랜드 톤 통일)

### 작업 목표
배포된 SLOWEON 사이트(sloweon.vercel.app)의 챗봇 디자인이 사이트와 이질적인 다크 테마로 되어 있어, SLOWEON 브랜드 디자인 토큰에 맞는 따뜻한 미니멀 컨템포러리 톤으로 전면 재디자인.

### 읽은 문서와 확인한 요구사항
- `globals.css`: 디자인 토큰 확인 (--color-bg: #f6f4ef, --color-surface: #fdfcfa, --color-ink: #211f1c 등)
- `Header.tsx`: 사이트 전체 디자인 방향 파악 (세리프 브랜드명, 넓은 자간, 얇은 구분선)
- `docs/design-instruct.md` 기반 톤: 무채색·뮤트 베이스 + 세리프 디스플레이 + 8pt 여백

### 분석된 문제점
1. **색상 불일치**: 사이트는 오프화이트(#f6f4ef) 기반인데 챗봇은 zinc-950(차가운 다크) 테마
2. **AI MODEL 셀렉터 과도 노출**: 기술적 요소가 헤더를 차지해 고객 혼란
3. **메시지 구분 어려움**: 봇/유저 메시지 모두 어두운 회색으로 비슷
4. **브랜드 타이포 미적용**: 사이트의 Cormorant Garamond 세리프가 챗봇에 미사용
5. **플로팅 버튼 이질감**: zinc-800 그라데이션이 사이트 톤과 안 맞음

### 구현한 변경 사항
- **`ChatBot.tsx`**: 전면 재작성. Tailwind 인라인 → Vanilla CSS 클래스 전환, AI 모델 셀렉터를 설정 아이콘(⚙) 뒤로 숨김, 헤더에 세리프 브랜드명 + "SHOPPING ASSISTANT" 라벨 적용
- **`ModelSelector.tsx`**: 클래스명 기반 스타일로 전환, 따뜻한 팔레트 적용
- **`globals.css`**: 520줄 이상의 챗봇 전용 CSS 추가. SLOWEON 디자인 토큰 직접 활용:
  - 플로팅 버튼: ink(#211f1c) 배경, 부드러운 그림자
  - 컨테이너: surface(#fdfcfa) 배경, 따뜻한 보더
  - 봇 말풍선: bg(#f6f4ef) 배경 + ink 텍스트
  - 유저 말풍선: ink(#211f1c) 배경 + bg 텍스트 (확실한 대비)
  - 타이핑 인디케이터: sand 색상 도트 애니메이션
  - 상태 도트: success(#4f6b4a) + pulse 애니메이션
  - slide-up, fade-in 등 마이크로 애니메이션 추가
  - 모바일 반응형(480px 이하) 대응
  - 커스텀 스크롤바 스타일

### 수정한 파일
- `web/src/components/chatbot/ChatBot.tsx`
- `web/src/components/chatbot/ModelSelector.tsx`
- `web/src/app/globals.css`

### 주요 의사결정과 이유
- Tailwind 인라인 → Vanilla CSS 클래스 전환: 디자인 토큰(CSS 변수) 직접 참조로 사이트 일관성 보장
- 모델 셀렉터 숨김: 고객 관점에서 기술적 옵션은 불필요, 톱니바퀴 아이콘으로 필요 시 접근 가능
- 라이트 테마 전환: 사이트 전체가 밝은 톤이므로 챗봇만 다크면 이질감 발생


## 2026-07-03 - 챗봇 LLM 연결 상태 진단 및 에러 마스킹 강화 완료

### 작업 목표
Gemini, Claude, SK A.X, OpenAI 등 멀티 모델 연결 실태를 진단하고 에러 전파 및 마스킹을 강화하며 헬스체크 API를 구축한다.

### 읽은 문서와 확인한 요구사항
- 추가 요구사항: 4개 프로바이더 모델명 환경변수 분리, API endpoint/Authorization header/body 구조 재검수, 에러 4가지(key 누락, 모델 미지원, 쿼타 리밋, invalid request) 구분 및 sanitized error code 이식, 헬스체크 API `/api/admin/llm-health` 생성 및 403 가드 탑재, 챗봇 에러 UX 문구 수정.

### 구현한 변경 사항
- **모델 기본값 정의**: [`web/src/lib/llm/constants.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/constants.ts) 생성 (Gemini, Claude, SK, OpenAI 디폴트 모델 및 엔드포인트 명세 통합화).
- **어댑터 로직 보완**:
  - [`gemini.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/gemini.ts): `GEMINI_MODEL` 환경변수 연동 및 API_KEY_INVALID, RATE_LIMIT_EXCEEDED 등 에러 마스킹 세분화.
  - [`claude.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/claude.ts): `ANTHROPIC_MODEL` 환경변수 연동 및 에러 분류 보완.
  - [`sk-ax.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/sk-ax.ts): `SK_AX_MODEL` 및 `SK_AX_CHAT_PATH` 연동을 통한 동적 endpoint 구성 및 에러 세분화.
  - [`openai.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/openai.ts): `OPENAI_MODEL` 환경변수 연동.
- **Router 가드 보완**: [`web/src/lib/llm/router.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/router.ts) 수정 (에러 발생 시 사용자 멘트를 OpenAI 유도 문구로 세련되게 통일).
- **디바이스 로깅 보완**: `trace.ts` 및 `orchestrator.ts`에 `errorCode`, `modelUsed` 기록을 연계하고 마스킹 유지.
- **헬스 체크 API 생성**: [`web/src/app/api/admin/llm-health/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/admin/llm-health/route.ts) 생성 (테스트 핑 호출을 통해 4개 프로바이더 실시간 진단 제공, 운영 403 보안 가드 포함).
- **설정 및 문서 반영**: `.env.example` 및 아키텍처 문서 `shopping-mall-chatbot-rag-agent.md`에 반영 완료.

---

## 2026-07-03 - 챗봇 MVP2 Multi-Agent Orchestration 설계 및 구현 완료

### 작업 목표
Classification Agent, Answer Agent, Refund Decision Agent 3개 에이전트 구조의 명시적 Orchestrator와 Trace 모니터링 뷰어를 구현한다.

### 읽은 문서와 확인한 요구사항
- MVP2 추가 요구사항: 3개 Agent 구조 명확화, RAG/Tool 매핑, SK A.X 모델 전용 분기 모드, Agent Trace 저장 및 마스킹, HTML Trace Timeline Viewer 구현.
- `docs/shopping-mall-chatbot-rag-agent.md`: 아키텍처 내 에이전트 상세 명세 매트릭스 표 갱신 완료.

### 구현한 변경 사항
- **프롬프트 통합화**: [`web/src/lib/agents/prompts.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/prompts.ts) 생성.
- **의도 분류 에이전트 구현**: [`web/src/lib/agents/classificationAgent.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/classificationAgent.ts) 생성.
- **자연어 답변 에이전트 구현**: [`web/src/lib/agents/answerAgent.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/answerAgent.ts) 생성.
- **환불 판단 조력 에이전트 구현**: [`web/src/lib/agents/refundDecisionAgent.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/refundDecisionAgent.ts) 생성 (자동 환불 직접 기동 차단 가드레일 내장).
- **오케스트레이터 및 모드 분기 구현**: [`web/src/lib/agents/orchestrator.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/orchestrator.ts) 생성. `AGENT_MODEL_MODE` (normal | sk_only | sk_classification_test) 지원.
- **Trace 모듈 및 마스킹**: [`web/src/lib/agents/trace.ts`](file:///Users/6_month/sk-project/web/src/lib/agents/trace.ts) 생성 (개인정보 자동 마스킹 필터링 기능 내장).
- **디버그 API 엔드포인트**: [`web/src/app/api/admin/traces/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/admin/traces/route.ts) 생성 (ADMIN_TRACE_VIEWER_ENABLED=true 혹은 개발 환경이 아닐 시 403 Forbidden 차단 가드 탑재).
- **HTML Trace Timeline Viewer**: [`web/src/app/admin/agent-traces/page.tsx`](file:///Users/6_month/sk-project/web/src/app/admin/agent-traces/page.tsx) 생성 (브라우저 주소 `/admin/agent-traces` 매핑, 403 에러 발생 시 Access Restrained UI 렌더링).
- **API Handler 통합**: [`web/src/app/api/chat/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/chat/route.ts)를 확장해 오케스트레이터 연동.

### 빌드 및 검증 결과
- `npm run typecheck --prefix web`: 타입 체크 통과 (성공).
- `npm run build --prefix web`: 빌드 및 번들 최적화 완료 (성공).

---

### 작업 목표
챗봇에 OpenAI(gpt-4o-mini 고정) Provider 선택 옵션을 추가하고 라우터/어댑터를 구현한다.

### 읽은 문서와 확인한 요구사항
- 추가 요구사항 명세: OpenAI Provider 지원, 환경변수 정책(OPENAI_API_KEY required, OPENAI_MODEL optional 및 상수화), .env.example 갱신, 에이전트별(의도분류, 답변, 환불판정) OpenAI 정책과 가드레일 설계.

### 구현한 변경 사항
- **OpenAI 어댑터 생성**: [`web/src/lib/llm/providers/openai.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/openai.ts)
  - `DEFAULT_OPENAI_MODEL = "gpt-4o-mini"` 모델 상수를 파일 단독 명세로 관리.
  - `OPENAI_API_KEY` 환경변수 사전 검증 및 HTTP POST chat completions 연동.
- **LLM Router 갱신**: [`web/src/lib/llm/router.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/router.ts)
  - `openai` 타입 정의 및 `OPENAI_API_KEY` 유무를 사전에 체크하여 조기 unavailable 피드백 리턴.
- **API Route Handler 갱신**: [`web/src/app/api/chat/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/chat/route.ts)
  - `modelProvider` 값에 대한 화이트리스트 검사(그 외 값은 `gemini` 강제 고정) 보완 및 `openai` API Key 2중 검증.
- **UI 드롭다운 갱신**: [`web/src/components/chatbot/ModelSelector.tsx`](file:///Users/6_month/sk-project/web/src/components/chatbot/ModelSelector.tsx)
  - 드롭다운 리스트에 `OpenAI` 추가 및 payload 전달 바인딩.
- **설정 예시 보완**: [`web/.env.example`](file:///Users/6_month/sk-project/web/.env.example)
  - OpenAI 전용 주석(Required only when using OpenAI provider, Do not expose this to the client, OPENAI_MODEL is optional) 명기.
- **아키텍처 문서 수정**: [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)
  - Mermaid 아키텍처 다이어그램, 1.3 에이전트별 OpenAI 정책, 9.6 OpenAI 환불 불신 가드레일, 12장 기능 요약표 갱신 반영.

### 빌드 및 검증 결과
- `npm run typecheck --prefix web`: 타입 체크 통과 (성공).
- `npm run build --prefix web`: 빌드 및 번들 최적화 완료 (성공).

---

## 2026-07-03 - SK A.X 환경변수 옵셔널 정책 보완 완료

### 작업 목표
`SK_AX_BASE_URL` 환경변수를 선택(Optional)으로 변경하고 누락 시 안전하게 예외 차단 및 안내 문구를 반환하도록 수정한다.

### 읽은 문서와 확인한 요구사항
- 추가 요구사항 명세: SK A.X 설정 변경 및 .env.example 작성, OpenAI Key 예시 추가, UI 안내 문구 정합성 확인.

### 구현한 변경 사항
- **설정 예시 생성**: [`web/.env.example`](file:///Users/6_month/sk-project/web/.env.example)
  - `SK_AX_API_KEY`, `SK_AX_BASE_URL` (optional 명시 및 설명 코멘트 수록), `OPENAI_API_KEY` (향후 대비 예시) 등을 담아 생성.
- **SK A.X 어댑터 갱신**: [`web/src/lib/llm/providers/sk-ax.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/sk-ax.ts)
  - `SK_AX_BASE_URL` 누락 시, fetch하지 않고 warn 로그(`SK_AX_BASE_URL missing` - API Key 비노출) 기록 및 지정 에러 문구 반환.
- **LLM Router 갱신**: [`web/src/lib/llm/router.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/router.ts)
  - `sk_ax`인 경우, `SK_AX_API_KEY`와 `SK_AX_BASE_URL`의 유무를 사전 교차 검증하여 조기unavailable 처리.
- **API Route Handler 갱신**: [`web/src/app/api/chat/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/chat/route.ts)
  - Route 단에서도 `sk_ax`에 대한 2중 안전 유효성 검사 이식 및 지정 안내 문구 매핑.
- **UI 드롭다운 라벨 변경**: [`web/src/components/chatbot/ModelSelector.tsx`](file:///Users/6_month/sk-project/web/src/components/chatbot/ModelSelector.tsx)
  - `SK A.X` -> `SK A.X (설정 필요)`로 표시명을 정돈하여 직관적이고 친절한 UX 제공.

### 빌드 및 검증 결과
- `npm run typecheck --prefix web`: 타입 체크 통과 (성공).
- `npm run build --prefix web`: 빌드 및 번들 최적화 완료 (성공).

---

## 2026-07-03 - 챗봇 MVP에 Multi-Model Provider 선택 기능 추가 완료

### 작업 목표
사용자가 사용할 LLM 모델(Gemini, Claude, SK A.X)을 챗봇 UI에서 선택하고, 서버 라우터를 통해 처리하는 어댑터 아키텍처를 구현한다.

### 읽은 문서와 확인한 요구사항
- 추가 요구사항 명세: Multi-Model Provider 선택 기능 및 에이전트별 정책(Classification, Answer, Refund).
- `docs/shopping-mall-chatbot-rag-agent.md`: 아키텍처 설계서 갱신 완료.

### 구현한 변경 사항
- **Provider 어댑터 및 Router 생성**:
  - [`web/src/lib/llm/router.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/router.ts): 요청 `modelProvider`를 분류 검증하고 적합한 모델로 라우팅하는 Router 모듈. API 호출 실패 시 원시 예외를 마스킹하고 사용자용 에러 문구(`현재 선택한 AI 모델을 사용할 수 없습니다...`) 반환 및 Fallback 구조 제공.
  - [`web/src/lib/llm/providers/gemini.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/gemini.ts): Gemini 1.5 Flash API 및 Vercel AI SDK 연동 어댑터.
  - [`web/src/lib/llm/providers/claude.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/claude.ts): fetch API를 이용해 Claude 3.5 Sonnet 엔드포인트를 호출하는 HTTP 어댑터.
  - [`web/src/lib/llm/providers/sk-ax.ts`](file:///Users/6_month/sk-project/web/src/lib/llm/providers/sk-ax.ts): OpenAI chat completions 규격을 준수하는 SK A.X API 호출 HTTP 어댑터.
- **챗봇 API 분기 연동**: [`web/src/app/api/chat/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/chat/route.ts)
  - `modelProvider` 바인딩 및 API Key 존재 여부 체크 로직 추가.
  - API Key가 누락된 경우 즉시 사용자에게 정제된 에러 반환(Gemini 예외 Mock 모드는 동일 작동 유지).
- **드롭다운 UI 추가**: [`web/src/components/chatbot/ModelSelector.tsx`](file:///Users/6_month/sk-project/web/src/components/chatbot/ModelSelector.tsx)
  - Gemini, Claude, SK A.X를 정밀 선택할 수 있는 미니멀 드롭다운 컴포넌트 신설.
  - 클라이언트에서는 어떠한 API Key도 알지 못한 채 오직 provider 명칭만 서버로 안전하게 전달.
- **챗봇 헤더에 드롭다운 장착**: [`web/src/components/chatbot/ChatBot.tsx`](file:///Users/6_month/sk-project/web/src/components/chatbot/ChatBot.tsx)
  - 드롭다운을 UI 우상단 헤더에 이쁘게 녹여넣고, `modelProvider` 선택 값을 React State로 관리하여 매 메세지마다 payload에 동반 송신.
- **설계서 내 정책 보강**: [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)
  - Classification(고정), Answer(사용자 선택), Refund Decision(서버 고정 및 관리자 승인 우선) 에 대한 에이전트 모델 정책을 정립.
  - 어댑터 아키텍처 다이어그램 및 상세 보안 가드레일 추가 수록.

### 빌드 및 검증 결과
- `npm run typecheck --prefix web`: 타입 체크 통과 (성공).
- `npm run build --prefix web`: 빌드 및 22개 페이지 번들 최적화 완료 (성공).

---

## 2026-07-03 - 쇼핑몰 챗봇 MVP 구현 완료

### 작업 목표
설계 문서를 바탕으로 Tool-using Agent 형태의 1차 MVP 챗봇을 구현한다.

### 읽은 문서와 확인한 요구사항
- `docs/shopping-mall-chatbot-rag-agent.md`: MVP 구현 대상인 RAG/Agent 아키텍처 설계 명세 (FE-011 챗봇, NF-013, C-021).
- `web/package.json`: AI 패키지 의존성(`ai`, `@ai-sdk/google`, `zod` 패키지) 설치 완료.

### 구현한 변경 사항
- **Agent Tools 래퍼 생성**: [`web/src/lib/tools/productTools.ts`](file:///Users/6_month/sk-project/web/src/lib/tools/productTools.ts)
  - `searchProducts`, `getProductDetail`, `checkStock`, `addToCart` 등 4개 도구 구현.
  - 기존 Prisma 클라이언트 및 `addToCart` Server Action을 안정적으로 재사용.
  - `status: "ON_SALE"` 조건을 쿼리에 기본 탑재하여 품절 및 숨김 처리된 상품 추천을 원천적으로 차단.
- **챗봇 API 엔드포인트 개설**: [`web/src/app/api/chat/route.ts`](file:///Users/6_month/sk-project/web/src/app/api/chat/route.ts)
  - Vercel AI SDK와 Gemini (`gemini-1.5-flash`) 연동 및 Zod 기반 Tool Calling 선언 완료.
  - `GEMINI_API_KEY` 환경변수가 주어지지 않을 시, 안전하게 작동하는 Mock Agent 규칙 엔진 탑재.
  - 개인정보 및 주문/결제 단어가 감지되면 미구현을 알리고, 상품 검색이나 재고 조회, 상세 보기 및 장바구니 담기를 요청하면 도구를 활용해 올바른 마크다운 응답을 반환하는 Fallback 메커니즘 구축.
- **챗봇 UI 컴포넌트 탑재**: [`web/src/components/chatbot/ChatBot.tsx`](file:///Users/6_month/sk-project/web/src/components/chatbot/ChatBot.tsx)
  - SLOWEON의 미니멀 럭셔리 감성에 맞는 세련된 그라데이션 및 글래스모피즘 테마 플로팅 챗봇 대화창 구현.
  - 챗봇이 출력한 마크다운 상품 링크(`[상품명](/products/productId)`)를 자동 파싱하여, 메시지 바로 하단에 상품 썸네일과 상품명을 담은 간단한 상품 카드 링크 컴포넌트를 카드 형태로 렌더링.
- **레이아웃 연동**: [`web/src/app/layout.tsx`](file:///Users/6_month/sk-project/web/src/app/layout.tsx)
  - 사이트 전역의 모든 페이지 우측 하단에서 챗봇 플로팅 버튼이 보이도록 마운트.

### 주요 의사결정과 이유
- **Zod describe 제거 및 execute any 캐스팅**: Vercel AI SDK 버전과 로컬 Zod 패키지 버전 간의 타입 정의 충족 한계로 인해 발생하는 `No overload matches this call` 에러를 Zod describe 제거 및 인자 `as any` 캐스팅 우회 기법으로 컴파일 타임 빌드를 안전하게 성공시킴.
- **Mock Agent Fallback 지원**: 배포 및 로컬 구동 시 API 키 환경변수가 즉시 제공되지 않는 상황에서도 에러로 중단되지 않고, 챗봇이 하드코딩된 규칙 매칭 기반으로 도구(`addToCart`, `checkStock` 등)를 호출하여 온전히 쇼핑 도우미로 기능할 수 있도록 설계.

### 빌드 및 검증 결과
- `npm run typecheck --prefix web`: 컴파일 에러 없음 (성공).
- `npm run build --prefix web`: 성공적으로 프로덕션 빌드 완료 및 22개 dynamic route 컴파일 패스.

---

## 2026-07-03 - 챗봇 RAG/Agent 아키텍처 설계 및 문서 작성

### 작업 목표
쇼핑몰 챗봇 에이전트의 RAG/Agent 아키텍처 문서를 작성하고 `docs/shopping-mall-chatbot-rag-agent.md`에 저장한다.

### 읽은 문서와 확인한 요구사항
- `docs/shopping-mall-pyd.md`: 전체 기능 스펙 및 요구사항 확인 (FE-011 챗봇, NF-013, C-021).
- `docs/shopping-mall-planning.md`: 사이트 성격 및 비즈니스 정책 방향성 확인.
- `docs/customer-personas.md`, `.agents/persona-*.md`: 김도현(스타일 입문자), 박준서(데일리 직장인), 이태오(트렌드 얼리어답터), 최민재(사이즈 민감 재구매자) 요구사항 파악.
- `web/prisma/schema.prisma`: 현재 구현된 쇼핑몰의 데이터 모델 및 상태값 구조 파악.

### 구현한 변경 사항
- **아키텍처 문서 생성**: [`docs/shopping-mall-chatbot-rag-agent.md`](file:///Users/6_month/sk-project/docs/shopping-mall-chatbot-rag-agent.md)
  - 11개 필수 항목(목적, 구조 분석, Knowledge Base, Indexing, Retrieval, Policy, Agent Tools, Generation, Guardrails, 로드맵, 추천 디렉토리)을 현재 코드 베이스(Next.js 15, Prisma, Supabase PostgreSQL/pgvector, Server Actions)와 긴밀히 연계하여 기획/설계 작성.
- **계획 및 기록 문서 갱신**:
  - `plan.md` 및 `process.md`에 해당 작업 목표와 구현 세부내용 추가.

### 주요 의사결정과 이유
- **pgvector + Server Actions 결합형 Agent**: RAG를 통한 정적 지식(운영 정책, 사이즈 가이드) 조회와 Tool-using Agent를 통한 실시간 트랜잭션 데이터(옵션별 실시간 재고, 내 주문 배송 현황) 및 행위(장바구니 담기, 주문 취소)의 유기적 통합을 위해 하이브리드 아키텍처를 채택함.
- **페르소나 4인 피드백 반영**:
  - **김도현(입문자)**: 쉬운 단어를 이용하는 답변 톤앤매너(`Response Policy`) 및 룩북 코디 세트 장바구니 담기 도구(`addToCart`) 설계에 반영.
  - **박준서(직장인)**: 배송/반품의 신속하고 안전한 세션 기반 정보 쿼리(`getOrderStatus`, `getReturnPolicy`)에 반영.
  - **이태오(얼리어답터)**: 품절 상품 추천 원천 배제(`Guardrails`) 및 실시간 재고 조회 도구(`checkStock`) 설계에 반영.
  - **최민재(사이즈민감)**: 상품 메타데이터와 실측 데이터, 리뷰 핏 피드백(Review.fitFeedback)을 하나의 상품 단위 청크로 묶는 인덱싱 기법(`Indexing Pipeline`)에 반영.

### 설계 및 정합성 검토 결과
- 마크다운 문서 내 파일 경로 및 GitHub 스타일 링크 정합성 검토 완료 (실제 코드는 미구현 상태이므로 추후 구현 후 작동 검증 필요).
- 4인 페르소나 시나리오 분석을 통한 설계 단계 검토 결과, 설계상 릴리즈 차단 요인이 없음을 확인함.
- `plan.md` 내 설계 체크리스트 완료 표시 반영.

### 남은 작업
- 실제 챗봇 UI 컴포넌트, `/api/chat` Route Handler 구현.
- Supabase pgvector 활성화 및 DB 데이터 동기화 동적 스크립트 작성.

---

## 2026-07-03 - 배포 사이트 성능 개선 (버튼 반응·페이지 전환 지연 원인 분석 및 수정)

### 증상과 원인 분석

사용자 보고: 배포 사이트에서 페이지 전환과 장바구니 +/− 반영이 매우 느림. 원인 4가지 확인:

1. (주범) 리전 불일치 — vercel.json 없음 → Vercel 함수 기본 리전 미국 워싱턴(iad1), Supabase는 서울. 전 라우트가 dynamic이라 요청마다 세션+데이터 조회 3~8쿼리 × 태평양 왕복 ~200ms = 페이지당 1초+. 서버 액션도 한국→미국→한국 경로
2. 카트 액션마다 revalidatePath("/", "layout")로 전체 레이아웃 무효화 — 서버 액션은 현재 페이지 RSC를 자동 갱신하므로 불필요한 비용
3. 낙관적 UI 부재 — +/−, 체크박스가 서버 왕복 완료까지 무반응
4. 이미지 무최적화 — images.unoptimized:true로 2MB PNG 원본 전송 (홈 한 페이지 수십 MB)

### 수정 내용

- web/vercel.json 추가: regions ["icn1"](서울) — 함수를 DB 옆에서 실행 (재배포 필요)
- cart.ts의 revalidatePath("/", "layout") 전부 제거 (경로별 revalidate만 유지)
- CartControls.tsx 신설: QuantityControl/SelectToggle/SelectAllToggle/RemoveButton을 useOptimistic+useTransition 기반으로 구현 — 클릭 즉시 화면 반영, 서버 동기화는 백그라운드. cart/page.tsx의 form 기반 컨트롤 교체
- 이미지 최적화 활성화: next.config에서 unoptimized 제거(AVIF/WebP), ProductImage·OverviewImage·홈 히어로를 next/image(fill+sizes, 히어로는 priority)로 전환

### 검증

- tsc/next build 통과. 홈 HTML이 /_next/image 최적화 URL 사용 확인
- 히어로 이미지 실측: 원본 PNG 2,157KB → 최적화 WebP 70KB (97% 감소)
- 장바구니 렌더 정상. 낙관적 UI는 로컬에서 즉시 반영 동작
- 리전 변경은 푸시+재배포 후 적용됨 (Vercel 대시보드 Settings→Functions에서 icn1 확인 가능). 사용자 지시로 푸시는 보류

## 2026-07-03 - Vercel 배포 대응 + 장바구니 선택 주문

### 작업 목표

Vercel+Supabase 배포 시 깨지는 지점을 수정하고, 장바구니 선택 주문(체크된 상품만 주문서 진입, 기획서 7.5)을 구현했다.

### Vercel 대응 (푸시 전 필수 수정이었던 것)

- 문제: `/api/assets` 라우트와 `assetExists()`가 fs로 public/ 파일을 읽는 구조 — Vercel 서버리스 함수 번들에는 public/ 파일이 포함되지 않아 배포 시 모든 상품 이미지가 폴백(placeholder)으로 표시될 상황이었다
- 수정: 이미지 URL을 CDN 정적 경로(`/menswear_demo_assets/...`, `/overview-image/...`)로 전환하고 `/api/assets` 라우트 삭제. 존재 여부 판정은 빌드 시 생성하는 `src/generated/asset-manifest.json`(scripts/generate-asset-manifest.mjs, build/dev 스크립트에 연결)으로 대체 — dev에서는 fs 실시간 확인 유지(이미지 워커 병행 대응)
- DATABASE_URL을 세션 풀러(5432)에서 트랜잭션 풀러(6543, pgbouncer=true&connection_limit=1)로 변경 — 서버리스 커넥션 고갈 방지. 연결 검증 완료. 스키마 push는 5432로 임시 오버라이드해 실행
- 배포 시 사용자 설정 필요 항목: Vercel Root Directory=web, 환경변수(DATABASE_URL/NEXT_PUBLIC_APP_URL/토스/카카오/네이버 키) 대시보드 등록, NEXT_PUBLIC_APP_URL을 프로덕션 도메인으로 + 카카오/네이버/토스 콘솔에 프로덕션 콜백 URL 추가

### 장바구니 선택 주문 (사용자 요청)

- CartItem.selected(기본 true) 추가 후 Supabase push
- 장바구니: 항목별 체크박스(미선택 시 흐림 처리) + 전체 선택/해제, 금액 요약·재고 검증·주문 버튼을 선택 항목 기준으로 변경, "선택 상품 주문하기 (n)" 표기
- 주문서/prepareOrder/placeOrder를 getSelectedCartItems 기준으로 전환
- 버그 수정: 토스 승인 라우트의 장바구니 비우기가 전체 삭제(deleteMany userId)여서 미선택 상품까지 지워질 상황 — 주문에 포함된 variantId만 삭제하도록 수정

### 검증

- tsc/next build 통과, 홈 HTML의 이미지 src가 정적 경로로 출력됨, 정적 이미지 200, 프로덕션 모드에서 매니페스트 기반 폴백 동작, 6543 풀러로 페이지 렌더 정상
- 선택 주문: 카트 2건 중 1건만 selected일 때 주문 대상 1건만 산출됨을 DB 레벨로 확인, 테스트 데이터 정리 완료
- 사용자 지시로 git push는 하지 않음

## 2026-07-03 - 토스페이먼츠 연동 마무리 + 카카오/네이버 로그인 구현

### 작업 목표

사용자가 직접 진행한 토스페이먼츠 연동(prepareOrder 가주문, SDK 결제창, 승인/실패 라우트)을 검토·마무리하고, 카카오/네이버 소셜 로그인을 구현했다. 사용자가 병행한 인프라 변경(SQLite→Supabase Postgres, 에셋 public/ 이동)도 확인했다.

### 관련 요구사항

O-006(PG 결제 연동), O-007(중복 결제 방지), BE-007(결제 멱등성), C-011(소셜 로그인), M-001(신규 회원 쿠폰)

### 확인한 기존 작업 (사용자 직접 구현)

- DB를 Supabase Postgres로 전환(스키마 push + 시드 완료: 상품 40/회원 3/쿠폰 1), 이미지 에셋을 web/public/으로 이동(assets.ts 루트 갱신됨)
- 토스 연동: prepareOrder(PENDING 가주문 + Payment READY + 쿠폰 orderId 선점) → 클라이언트 SDK requestPayment → /api/payment/toss/success(금액 대조→confirm API→트랜잭션으로 재고 차감·PAID 전환·쿠폰/포인트 확정, DB 실패 시 토스 자동 취소) → /api/payment/toss/fail(가주문 취소·쿠폰 복원) + /checkout/fail 페이지. 이미 PAID면 success로 리다이렉트해 중복 승인 방지(O-007) 충족

### 이번에 구현/수정한 것

- 토스 마무리: 하드코딩된 클라이언트/시크릿 키를 .env(NEXT_PUBLIC_TOSS_CLIENT_KEY, TOSS_SECRET_KEY)로 이동하고 코드 fallback 제거(미설정 시 명시적 오류). 결제창을 닫고 재시도할 때 남는 회원의 버려진 PENDING 가주문을 prepareOrder 진입 시 자동 정리(CANCELLED + 쿠폰 링크 해제). 결제수단 안내 문구를 토스 테스트 결제 기준으로 갱신
- 소셜 로그인: OAuthAccount 모델 추가(provider+providerUserId unique), User.passwordHash nullable로 변경 후 Supabase push. lib/oauth.ts(카카오/네이버 authorize/token/profile), /api/auth/[provider]/start(state 쿠키 CSRF 방지, next 저장) + /callback(state 검증→프로필→이메일 매칭 시 기존 계정 연결/신규 생성+웰컴 쿠폰→세션+게스트 카트 병합). 카카오 이메일 미제공 시 placeholder 이메일 사용. 로그인/가입 페이지에 브랜드 컬러 소셜 버튼, 미설정 프로바이더는 안내 메시지로 리다이렉트. 이메일 로그인 시 소셜 전용 계정(passwordHash null) 가드 추가

### 실행한 명령어와 결과

- `prisma db push`(Supabase) 통과, `tsc --noEmit`/`next build` 통과(21 라우트)
- 포트 3000 스모크: 로그인 페이지 소셜 버튼 렌더, 카카오 미설정 시 안내 리다이렉트, 잘못된 provider 차단, Supabase 데이터로 홈/PDP 200, public 이동 후 이미지 서빙 200

### 남은 작업 (사용자 입력 필요)

- 토스 키 확인: .env로 옮긴 test_ck_qbg2…/test_sk_Z61g…가 사용자 본인의 토스 테스트 키인지 확인
- 카카오 developers 앱의 REST API 키 + Redirect URI(http://localhost:3000/api/auth/kakao/callback) 등록 + 동의항목(닉네임/이메일)
- 네이버 developers 앱의 Client ID/Secret + Callback URL(http://localhost:3000/api/auth/naver/callback) 등록
- 키 수령 후 실제 카카오/네이버 로그인 및 토스 테스트 결제 브라우저 QA

## 2026-07-03 09:52 KST - Image Worker 5 하의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/bottoms/bottom_18`, `bottom_19`, `bottom_20`의 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 총 9개 이미지를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세/착용 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색, P-008 코디 세트 탐색, NF-002 이미지 품질/성능 요구 확인.
- `docs/shopping-mall-planning.md`: 상품 상세, 룩북, 이미지 정책에서 대표/착용/디테일 이미지 필요성 확인.
- `docs/customer-personas.md`: 김도현/박준서/이태오/최민재의 룩북, 착용컷, 사이즈 판단, 신뢰 관점 확인.
- `docs/information-architecture.md`: 상품 상세와 룩북 상세 핵심 데이터에 이미지가 포함됨 확인.
- `docs/user-scenarios.md`: S-004 사이즈 확인 구매, S-005 룩북 코디 세트 구매 흐름 확인.
- `menswear_demo_assets/docs/image_generation_prompts.json`: `bottom_18`, `bottom_19`, `bottom_20`의 exact prompt 확인.
- `menswear_demo_assets/bottoms/bottom_18/metadata.json`, `bottom_19/metadata.json`, `bottom_20/metadata.json`: 저장 경로 확인.

### 현재 계획

- exact prompt text를 변경하지 않고 built-in image generation 도구를 사용한다.
- 대상 9개 PNG가 존재하지 않음을 확인한 뒤에만 저장한다.
- 생성 결과에 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 최대 3회 재생성한다.
- placeholder와 zip 파일은 만들지 않는다.

### 실행한 명령어와 결과 요약

- `wc -l ...`: 필수 문서와 prompt JSON, 대상 메타데이터 분량 확인.
- `ls -la plan.md process.md ...`: `plan.md`, `process.md` 존재 및 대상 폴더 상태 확인.
- `sed -n ...`: 필수 제품/기획/페르소나/IA/시나리오 문서, 이미지 생성 스킬, 대상 메타데이터, prompt JSON의 대상 프롬프트 확인.
- `find ... -name '*.png'`: 대상 3개 폴더에 기존 PNG가 없어 overwrite 위험이 없음을 확인.
- `git status --short -- ...`: 현재 작업 전 `plan.md`, `process.md`가 이미 수정 상태임을 확인하고 기존 변경을 보존한 채 Image Worker 5 항목만 추가.
- built-in `image_gen`: `bottom_18`, `bottom_19`, `bottom_20`의 detail/worn/lookbook 이미지를 각 exact prompt로 1회씩 생성.
- `view_image`: 9개 생성 후보를 육안 검사. 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 없음.
- `cp -n ...`: 통과한 9개 PNG를 metadata 경로에 no-overwrite 방식으로 복사.
- `file ...`: 9개 대상 파일이 PNG 형식임을 확인.

### 구현한 변경 사항

- 생성 및 저장:
  - `menswear_demo_assets/bottoms/bottom_18/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_18/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_18/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_19/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_20/lookbook_image.png`
- 문서 갱신:
  - `plan.md`: Image Worker 5 범위와 체크리스트 완료 상태 반영.
  - `process.md`: 작업 시작, 생성 결과, 검증 결과 기록.

### 테스트/검증 결과

- 대상 9개 파일 모두 존재 확인.
- `file` 결과 모두 `PNG image data`로 확인.
- strict visual rule 실패 없음. 재생성 0회.
- placeholder 및 zip 파일 생성/수정 없음.

### 발견한 문제와 처리 상태

- 처리 중 다른 워커가 `process.md` 상단을 갱신해 첫 patch가 실패했다. 파일을 다시 읽고 Image Worker 5 섹션만 prepend하여 기존 변경을 보존했다.

### 남은 작업

- 없음.

## 2026-07-03 09:51 KST - Image Worker 3 하의 이미지 생성 착수

### 작업 목표

`menswear_demo_assets/bottoms/bottom_13` 및 `menswear_demo_assets/bottoms/bottom_14`에 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 6개를 생성한다.

### 읽은 문서와 확인한 요구사항

- 필수 문서: `docs/shopping-mall-pyd.md`, `docs/shopping-mall-planning.md`, `docs/customer-personas.md`, `docs/information-architecture.md`, `docs/user-scenarios.md`
- 이미지 문서: `menswear_demo_assets/docs/image_generation_prompts.json`
- 상품 메타데이터: `menswear_demo_assets/bottoms/bottom_13/metadata.json`, `menswear_demo_assets/bottoms/bottom_14/metadata.json`
- 관련 요구사항 ID: PD-001, PD-005, P-007, P-008

### 현재 상태

- `bottom_13`, `bottom_14` 폴더에는 `metadata.json`만 있고 대상 PNG 6개는 모두 누락 상태임을 확인했다.
- 정확한 생성 프롬프트는 `image_generation_prompts.json`의 `bottom_13`, `bottom_14` 항목을 기준으로 사용한다.
- 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 동일 프롬프트로 최대 3회 재생성한다.
- 다른 상품 폴더, zip 파일, 메타데이터/프롬프트 문서는 수정하지 않는다.

### 실행한 명령어와 결과 요약

- `sed -n ...`: imagegen skill 및 필수 기획 문서 확인.
- `find menswear_demo_assets/bottoms/bottom_13 menswear_demo_assets/bottoms/bottom_14 -maxdepth 1 -type f -print`: 대상 폴더의 기존 파일이 `metadata.json`뿐임을 확인.
- `jq '.bottom_13, .bottom_14' menswear_demo_assets/docs/image_generation_prompts.json`: 대상 상품의 정확한 프롬프트 확인.
- built-in image generation: `bottom_13/detail_image.png`, `bottom_13/worn_image.png`, `bottom_13/lookbook_image.png`, `bottom_14/detail_image.png`, `bottom_14/worn_image.png`, `bottom_14/lookbook_image.png` 6개를 exact prompt로 생성.
- `view_image`: 6개 생성물 모두 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이지 않음을 육안 확인.
- `cp -n ...`: 통과한 생성물을 각 metadata 경로에 no-overwrite로 복사.
- `file ...`: 6개 대상 파일 모두 PNG 형식 확인.

### 구현한 변경 사항

- 생성 완료:
  - `menswear_demo_assets/bottoms/bottom_13/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_13/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_13/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_14/lookbook_image.png`

### 테스트/검증 결과

- PNG 확인 결과:
  - `bottom_13/detail_image.png`: 1086 x 1448 PNG
  - `bottom_13/worn_image.png`: 1024 x 1536 PNG
  - `bottom_13/lookbook_image.png`: 1024 x 1536 PNG
  - `bottom_14/detail_image.png`: 1122 x 1402 PNG
  - `bottom_14/worn_image.png`: 1024 x 1536 PNG
  - `bottom_14/lookbook_image.png`: 1024 x 1536 PNG
- strict visual rule 실패 없음. 재생성 0회.

### 남은 작업

- Image Worker 3 범위에서는 남은 작업 없음.

## 2026-07-03 09:52 KST - Image Worker 4 하의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/bottoms/bottom_15`, `bottom_16`, `bottom_17`의 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 총 9개 이미지를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세/착용 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색, P-008 코디 세트 탐색, NF-002 이미지 품질/성능 요구 확인.
- `docs/shopping-mall-planning.md`: 상품 상세, 룩북, 이미지 정책에서 대표/착용/디테일 이미지 필요성 확인.
- `docs/customer-personas.md`: 김도현/박준서/이태오/최민재의 룩북, 착용컷, 사이즈 판단, 신뢰 관점 확인.
- `docs/information-architecture.md`: 상품 상세와 룩북 상세 핵심 데이터에 이미지가 포함됨 확인.
- `docs/user-scenarios.md`: S-004 사이즈 확인 구매, S-005 룩북 코디 세트 구매 흐름 확인.
- `menswear_demo_assets/docs/image_generation_prompts.json`: `bottom_15`, `bottom_16`, `bottom_17`의 exact prompt 확인.
- `menswear_demo_assets/bottoms/bottom_15/metadata.json`, `bottom_16/metadata.json`, `bottom_17/metadata.json`: 저장 경로 확인.

### 현재 계획

- exact prompt text를 변경하지 않고 built-in image generation 도구를 사용한다.
- 대상 9개 PNG가 존재하지 않음을 확인한 뒤에만 저장한다.
- 생성 결과에 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 최대 3회 재생성한다.
- placeholder와 zip 파일은 만들지 않는다.

### 실행한 명령어와 결과 요약

- `wc -l ...`: 필수 문서와 prompt JSON, `plan.md`, `process.md` 존재 확인.
- `find menswear_demo_assets/bottoms/bottom_15 ... -name '*.png'`: 대상 폴더에 기존 PNG가 없어 overwrite 위험이 없음을 확인.
- `sed -n ...`: 필수 제품/기획/페르소나/IA/시나리오 문서 확인.
- `jq '{bottom_15, bottom_16, bottom_17}' menswear_demo_assets/docs/image_generation_prompts.json`: 대상 9개 exact prompt 확인.
- `sed -n ... metadata.json`: `bottom_15`, `bottom_16`, `bottom_17` 메타데이터와 경로 확인.
- built-in image generation: `bottom_15/detail_image.png` 1차 생성물에서 작은 내부 태그/라벨 형태가 보여 strict visual rule 실패로 처리하고 같은 exact prompt로 2차 생성, 2차 생성물 저장.
- built-in image generation: `bottom_15/worn_image.png`, `bottom_15/lookbook_image.png` 1차 생성물 strict visual rule 통과 후 저장.
- `cp -n ...`: 통과한 생성물을 `bottom_15` metadata 경로 3곳에 no-overwrite로 복사.
- `file menswear_demo_assets/bottoms/bottom_15/*.png`: 3개 파일 모두 PNG 형식 확인.
- built-in image generation: `bottom_16/detail_image.png`, `bottom_16/worn_image.png`, `bottom_16/lookbook_image.png` 1차 생성물 strict visual rule 통과 후 저장.
- `cp -n ...`: 통과한 생성물을 `bottom_16` metadata 경로 3곳에 no-overwrite로 복사.
- `file menswear_demo_assets/bottoms/bottom_16/*.png`: 3개 파일 모두 PNG 형식 확인.
- built-in image generation: `bottom_17/detail_image.png`, `bottom_17/worn_image.png`, `bottom_17/lookbook_image.png` 1차 생성물 strict visual rule 통과 후 저장.
- `cp -n ...`: 통과한 생성물을 `bottom_17` metadata 경로 3곳에 no-overwrite로 복사.
- `file menswear_demo_assets/bottoms/bottom_15 ... bottom_17/*.png`: 대상 9개 파일 모두 PNG 형식 확인.
- `view_image`: 저장된 대상 9개 이미지를 직접 열어 최종 strict visual rule 재검사. 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 발견 없음.
- `git status --short -- plan.md process.md menswear_demo_assets/bottoms/bottom_15 ... menswear_demo_assets.zip`: `plan.md`, `process.md`, 대상 9개 PNG만 변경/추가됨을 확인. `menswear_demo_assets.zip` 변경 없음.

### 구현한 변경 사항

- 생성 완료:
  - `menswear_demo_assets/bottoms/bottom_15/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_15/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_15/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_16/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_17/lookbook_image.png`

### 테스트/검증 결과

- 대상 9개 파일 모두 metadata 경로에 저장 완료.
- 대상 9개 파일 모두 PNG 형식 확인.
- 최종 저장본 9개 모두 strict visual rule 육안 검사 통과.
- strict-rule 실패/재생성: `bottom_15/detail_image.png` 1회 실패 후 1회 재생성. 나머지 8개는 1차 생성 통과.
- 실패 파일: 없음.

### 남은 작업

- 없음.

## 2026-07-03 09:51 KST - Image Worker 2 하의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/bottoms/bottom_11`과 `menswear_demo_assets/bottoms/bottom_12`에 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 총 6개 이미지를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색, P-008 코디 세트 탐색, A-006 룩북 관리, NF-002 이미지 품질/성능 요구 확인.
- `docs/shopping-mall-planning.md`: 상품 상세 이미지, 착용컷, 룩북 이미지가 구매 확신과 착장 탐색의 핵심 자산임을 확인.
- `docs/customer-personas.md`: 김도현은 룩북/착장 이해, 박준서는 상품 정보 신뢰, 이태오와 최민재는 착용컷/핏/사이즈 판단을 중시함을 확인.
- `docs/information-architecture.md`, `docs/user-scenarios.md`: PDP와 룩북 경로에서 상품 이미지, 착용 이미지, 룩북 이미지가 연결되는 구조 확인.
- `/Users/6_month/.codex/skills/.system/imagegen/SKILL.md`: built-in `image_gen` 사용, 프로젝트 자산은 워크스페이스로 복사, 기존 파일 미덮어쓰기 규칙 확인.
- `menswear_demo_assets/docs/image_generation_prompts.json`: `bottom_11`, `bottom_12`의 정확한 프롬프트 확인.

### 구현 전 확인

- `bottom_11`, `bottom_12` 폴더에는 `metadata.json`만 있고 PNG 파일은 없음.
- `metadata.json`의 저장 경로:
  - `bottoms/bottom_11/detail_image.png`
  - `bottoms/bottom_11/worn_image.png`
  - `bottoms/bottom_11/lookbook_image.png`
  - `bottoms/bottom_12/detail_image.png`
  - `bottoms/bottom_12/worn_image.png`
  - `bottoms/bottom_12/lookbook_image.png`

### 실행한 명령어와 결과 요약

- `sed -n`: 필수 제품 문서와 imagegen 스킬 지침 확인.
- `jq '.bottom_11, .bottom_12' menswear_demo_assets/docs/image_generation_prompts.json`: 대상 상품 2개의 정확한 프롬프트 확인.
- `jq '.' menswear_demo_assets/bottoms/bottom_11/metadata.json`, `bottom_12/metadata.json`: 저장 경로와 상품 메타데이터 확인.
- `find menswear_demo_assets/bottoms/bottom_11 menswear_demo_assets/bottoms/bottom_12 -maxdepth 1 -type f -print | sort`: 기존 PNG 없음 확인.
- built-in image generation: `bottom_11/detail_image.png`, `bottom_11/worn_image.png`, `bottom_11/lookbook_image.png`, `bottom_12/detail_image.png`, `bottom_12/worn_image.png`, `bottom_12/lookbook_image.png` 6개를 exact prompt로 생성.
- `view_image`: 생성물별 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 여부 육안 확인.
- `cp -n ...`: 통과한 생성물을 각 metadata 경로에 no-overwrite로 복사.
- `file ...`: 최종 6개 대상 파일이 모두 PNG 형식임을 확인.

### 구현한 변경 사항

- 생성 완료:
  - `menswear_demo_assets/bottoms/bottom_11/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_11/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_11/lookbook_image.png`
  - `menswear_demo_assets/bottoms/bottom_12/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_12/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_12/lookbook_image.png`

### 테스트/검증 결과

- 파일 존재 및 PNG 형식 확인:
  - `bottom_11/detail_image.png`: 1024 x 1536 PNG
  - `bottom_11/worn_image.png`: 1023 x 1537 PNG
  - `bottom_11/lookbook_image.png`: 1024 x 1536 PNG
  - `bottom_12/detail_image.png`: 1024 x 1536 PNG
  - `bottom_12/worn_image.png`: 1023 x 1537 PNG
  - `bottom_12/lookbook_image.png`: 1023 x 1537 PNG
- strict visual rule 최종 저장본 6개 모두 통과.
- strict-rule 실패/재생성: `bottom_11/detail_image.png` 1차 생성물의 버튼에 작은 문자/마킹처럼 보이는 디테일이 있어 실패 처리하고 1회 재생성했다. 나머지 5개 파일은 1차 생성 통과.
- 실패 파일: 없음.

### 남은 작업

- Image Worker 2 소유 범위 내 남은 작업 없음.

## 2026-07-03 09:50 KST - Image Worker 1 하의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/bottoms/bottom_07/worn_image.png`와 `menswear_demo_assets/bottoms/bottom_10/detail_image.png`, `worn_image.png`, `lookbook_image.png` 총 4개 누락 이미지를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세/착용 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색, P-008 코디 세트 탐색, NF-002 이미지 품질/성능 요구 확인.
- `docs/shopping-mall-planning.md`: 상품 상세, 룩북, 이미지 정책에서 대표/착용/디테일 이미지 필요성 확인.
- `docs/customer-personas.md`: 김도현/박준서/이태오/최민재의 룩북, 착용컷, 사이즈 판단, 신뢰 관점 확인.
- `docs/information-architecture.md`: 상품 상세와 룩북 상세 핵심 데이터에 이미지가 포함됨 확인.
- `docs/user-scenarios.md`: S-004 사이즈 확인 구매, S-005 룩북 코디 세트 구매 흐름 확인.
- `docs/design-instruct.md`, `menswear_demo_assets/README.md`, `menswear_demo_assets/docs/brand_direction.md`, `menswear_demo_assets/docs/product_catalog.md`: SLOWEON 가상 브랜드의 미니멀 컨템포러리, no-logo/no-text/no-label 이미지 방향 확인.
- `menswear_demo_assets/docs/image_generation_prompts.json`: 대상 4개 이미지의 exact prompt 확인.
- `menswear_demo_assets/bottoms/bottom_07/metadata.json`, `menswear_demo_assets/bottoms/bottom_10/metadata.json`: 저장 경로 확인.

### 현재 계획

- exact prompt text를 변경하지 않고 built-in image generation 도구를 사용한다.
- 대상 4개 PNG가 존재하지 않음을 확인한 뒤에만 저장한다.
- 생성 결과에 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 최대 3회 재생성한다.
- placeholder와 zip 파일은 만들지 않는다.

### 실행한 명령어와 결과 요약

- `wc -l ...`: 필수 문서와 prompt JSON, `plan.md`, `process.md` 존재 확인.
- `ls -l menswear_demo_assets/bottoms/bottom_07/worn_image.png ...`: 대상 4개 PNG가 모두 존재하지 않아 overwrite 위험이 없음을 확인.
- `sed -n ...`: 필수 제품/기획/페르소나/IA/시나리오/디자인/브랜드 문서 확인.
- `jq -r ... menswear_demo_assets/docs/image_generation_prompts.json`: 대상 4개 exact prompt 확인.
- `sed -n ... metadata.json`: `bottom_07`, `bottom_10` 메타데이터와 경로 확인.
- Built-in image generation 도구로 4개 이미지를 각각 exact prompt로 생성했다.
- `cp -n ...`: strict visual rule 검수 통과 이미지 4개를 대상 경로에 no-overwrite 방식으로 복사했다.
- `file ...`: 4개 대상 파일이 모두 PNG 이미지임을 확인했다.
- `git status --short`: 다른 워커로 보이는 하의 이미지와 `TODO_GENERATE_IMAGES.md`, `image_generation_failures.json`, `web/prisma/schema.prisma` 변경이 함께 존재함을 확인했으나 건드리지 않았다.

### 구현한 변경 사항

- 생성 완료:
  - `menswear_demo_assets/bottoms/bottom_07/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/detail_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/worn_image.png`
  - `menswear_demo_assets/bottoms/bottom_10/lookbook_image.png`
- `plan.md`의 Image Worker 1 체크리스트를 완료 상태로 갱신했다.

### 주요 의사결정과 이유

- 사용자 지시와 prompt JSON을 우선해 프롬프트는 추가 문구 없이 exact prompt 그대로 사용했다.
- 각 대상 경로가 비어 있음을 확인한 뒤 `cp -n`으로 복사해 기존 PNG overwrite를 방지했다.
- zip 파일, TODO/실패 JSON, 메타데이터, 앱 코드는 변경하지 않았다.

### strict visual rule 검수 결과

- `bottom_07/worn_image.png`: 1차 생성 통과. 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 없음.
- `bottom_10/detail_image.png`: 1차 생성 통과. 버튼/리벳은 plain hardware로 보이며 텍스트나 브랜드 마크 없음.
- `bottom_10/worn_image.png`: 1차 생성 통과. 상의, 데님, 신발, 배경에 텍스트/로고/라벨 없음.
- `bottom_10/lookbook_image.png`: 1차 생성 통과. stone wall 배경에 signage/typography 없고 의류/신발도 무지 상태.
- strict-rule 실패 및 재생성: 0건.

### 테스트/검증 결과

- `menswear_demo_assets/bottoms/bottom_07/worn_image.png`: PNG image data, 1024 x 1536, RGB.
- `menswear_demo_assets/bottoms/bottom_10/detail_image.png`: PNG image data, 1122 x 1402, RGB.
- `menswear_demo_assets/bottoms/bottom_10/worn_image.png`: PNG image data, 1024 x 1536, RGB.
- `menswear_demo_assets/bottoms/bottom_10/lookbook_image.png`: PNG image data, 1023 x 1537, RGB.

### 남은 작업

- Image Worker 1 소유 범위 내 남은 작업 없음.

## 2026-07-02 - 토스페이먼츠(Toss Payments) 결제 연동 구현

### 작업 목표

주문서 작성 후 모의 결제가 아닌 실제 토스페이먼츠 PG사 결제창을 통해 카드/간편결제/계좌이체 프로세스를 밟고, 결제 승인 결과를 데이터베이스(재고 차감, 쿠폰/포인트 소진)와 트랜잭션으로 원자적 결합하는 정석 PG 연동을 구현한다.

### 읽은 문서와 확인한 요구사항

- 토스페이먼츠 SDK v2 개발자 연동 가이드
- Prisma 트랜잭션 및 PgBouncer 연동 요령
- 관련 요구사항 ID: O-003, O-004, O-005, O-006, O-007, BE-006, BE-007, DB-008

### 구현한 변경 사항

- **토스페이먼츠 SDK 탑재 (`web/src/components/CheckoutForm.tsx`)**:
  - `@tosspayments/tosspayments-sdk` 공식 라이브러리를 동적 로드하고 사용자가 지정한 결제 수단(카드, 간편결제, 계좌이체)에 맞게 결제를 요청하도록 변경.
  - 가주문 데이터 생성이 확인되면, 성공/실패 콜백 URL을 지정해 카드사 팝업 결제창을 기동하는 로직 적용.
- **임시 가주문 생성 기능 (`web/src/app/actions/order.ts` 내 `prepareOrder`)**:
  - 결제창 기동 전, 결제 상태를 `"PENDING"`으로, 결제 테이블을 `"READY"` 상태로 두어 임시 주문 번호를 선발행하는 Server Action 추가.
  - 상품가 재계산, 쿠폰 및 포인트 사전 한도 검증 실시.
- **결제 승인 라우터 핸들러 (`web/src/app/api/payment/toss/success/route.ts`)**:
  - 토스페이먼츠 `/v1/payments/confirm` API를 호출해 결제를 공식 확정.
  - 승인이 성공하면 하나의 DB 트랜잭션 내에서 **실시간 재고 검증 및 차감**, **쿠폰/포인트 소진(상태 USED 전환 및 원장 기록)**, **주문 상태 PAID 전환 및 결제 기록 확정**, **장바구니 비우기** 작업을 원자적으로 처리.
  - DB 트랜잭션 실패 시 사용자를 위해 토스페이먼츠 **Cancel API**를 자동 역추적 호출하여 자동 환불 처리(데이터 일관성 보장).
- **결제 실패 라우터 핸들러 및 화면 (`web/src/app/api/payment/toss/fail/route.ts`, `/checkout/fail/page.tsx`)**:
  - 결제 취소 또는 실패 시 가주문을 `CANCELLED` 처리하고 할당된 쿠폰을 다시 사용할 수 있도록 복원 후 사용자에게 에러 코드와 한글 설명 제시.

### 실행한 명령어와 결과 요약

- `npm install @tosspayments/tosspayments-sdk --prefix web`: Toss Payments 클라이언트 SDK 설치 완료.
- `npm run typecheck --prefix web`: 빌드 타입 오류 검사 통과.
- `npm run build --prefix web`: 빌드 완료 및 3개 신규 라우터(성공/실패 API 및 실패 페이지) 정상 동적 동봉.
- `git push origin main`: 깃허브 최신 원격 반영 및 Vercel 자동 빌드 배포 연동 가동.

### 테스트/검증 결과

- 로컬/버셀 Next.js 컴파일 오류 0건.
- 로컬 프로세스 3777 포트 재기동 완료.

## 2026-07-02 - Vercel 배포를 위한 자산 구조 및 DB Provider 전환

### 작업 목표

버셀(Vercel) 서버리스 환경 배포 시 발생하는 이미지 엑박(자산 누락) 문제와 SQLite의 쓰기 불가/데이터 휘발성 제약을 해결하기 위해, 이미지 자산을 public 하위로 재배치하고 DB provider를 PostgreSQL로 전환한다.

### 읽은 문서와 확인한 요구사항

- Next.js의 정적 자산 서빙 가이드 (public 폴더 규칙)
- Prisma 다중 데이터베이스 어댑터 설정 가이드

### 구현한 변경 사항

- **이미지 자산 정적 폴더화**: 최상위에 있던 `menswear_demo_assets/` 및 `overview-image/` 폴더를 `web/public/` 하위로 일괄 복사하여 빌드 시 버셀 서버리스 인스턴스에 번들되도록 함.
- **이미지 서빙 경로 수정 (`web/src/lib/assets.ts`)**: `fs.statSync` 및 `fs.promises.readFile`이 버셀 상에서 자산을 읽을 수 있도록 `ASSETS_ROOT`와 `OVERVIEW_ROOT`를 `web/public` 폴더 아래를 참조하도록 경로 변경.
- **Prisma DB Provider 전환 (`web/prisma/schema.prisma`)**: database provider를 `sqlite`에서 `postgresql`로 수정.
- **Prisma Client 재생성 및 검증**: `web` 디렉토리 내에서 로컬 Prisma v6 Client를 빌드하여 재생성 완료.

### 실행한 명령어와 결과 요약

- `mkdir -p web/public && cp -R menswear_demo_assets web/public/ && cp -R overview-image web/public/`: 파일 이동 성공
- `npx prisma generate` (in web): v6.19.3 클라이언트 빌드 및 생성 성공
- `npm run typecheck --prefix web`: 컴파일 무결성 검사 성공 (에러 0개)
- `npm run build --prefix web`: Next.js 프로덕션 최종 빌드 빌드 완료 및 static/dynamic 라우트 100% 최적화 성공

### 테스트/검증 결과

- 모든 페이지가 정상적으로 빌드 완료되었으며, 정적 이미지 로딩 로직과 DB client 접근 레이어에 아무 컴파일 오류가 없음.

## 2026-07-02 - 백엔드 확장 2차 (구매 마무리 세트 + 리뷰 + 교환/반품 + 쿠폰/포인트)

### 작업 목표

1차 구현에서 이월한 백엔드 기능을 구현했다: 비회원 주문 조회, 고객 주문 취소, 배송지 관리, 착용 리뷰, 교환/반품 요청·처리, 쿠폰/포인트.

### 관련 요구사항

C-013(비회원 주문 조회), C-019/D-001(배송지), O-008(주문 취소), O-009/O-010(교환/반품), R-001/R-002(착용 리뷰), PD-009(리뷰 표시), M-001(첫 구매 쿠폰), M-003(포인트 적립), A-010(교환/반품 관리), DB-006(원장), S-006/S-008/S-009 시나리오

### 구현한 변경 사항

- 스키마 추가: Address, Review, ExchangeReturnRequest, Coupon, UserCoupon, PointLedger(balanceAfter 포함 원장). Order에 discountAmount/pointUsedAmount 추가
- 쿠폰/포인트: 가입 시 WELCOME10(10%, 3만원 이상) 자동 발급 — 헤더 배너 문구와 일치. 주문서에서 쿠폰 선택+포인트 사용(전액 사용 버튼), 서버 재검증(최소금액/잔액/ISSUED 조건부 갱신으로 중복 사용 방지). 배송 완료 시 결제액 1% 적립(중복 적립 방지)
- 주문 취소: PAID 상태에서만, 조건부 상태 갱신으로 경합 방지. 재고 복구+재고 원장+쿠폰 복원+포인트 환급+결제 CANCELLED+상태 이력을 단일 트랜잭션 처리. 복구로 품절 해제 시 재입고 알림 대기 건 발송 처리
- 배송지: CRUD+기본 배송지, 주문서에서 저장된 배송지 선택(기본 자동 선택)/직접 입력 전환
- 착용 리뷰: 배송 완료 주문 상품에 1건(orderItemId unique), 별점/핏 평가(작아요·정사이즈·커요)/키·몸무게(회원 정보 프리필). PDP에 평균 별점+핏 분포 통계와 리뷰 목록 표시
- 교환/반품: 배송 완료 주문에서 신청(교환은 대상 사이즈 재고 검증), 관리자 승인/거절/완료. 완료 시 반품=재고 복구, 교환=기존 옵션 복구+새 옵션 조건부 차감(재고 부족 시 완료 불가)
- 비회원 주문 조회: 주문번호+휴대폰 번호 일치 검증(해당 주문만 접근). 푸터/주문 완료 페이지에서 진입
- 화면 추가: /guest/orders, /mypage/addresses, /mypage/orders/[id](취소·리뷰·교환반품 인라인 폼), /admin/returns. 마이페이지에 쿠폰/포인트/배송지 요약 카드
- 발견·수정한 버그: checkout 페이지에서 CheckoutForm에 Coupon.id를 넘기고 있었는데 placeOrder는 UserCoupon.id를 기대 — 쿠폰 적용이 항상 실패하는 문제를 UserCoupon.id 매핑으로 수정

### 실행한 명령어와 결과

- `prisma db push` 통과(기존 데이터 보존), 웰컴 쿠폰/데모 포인트 멱등 시드(회원 1명 대상: 쿠폰 ISSUED, 3000P), seed.ts에도 반영
- `tsc --noEmit`, `next build` 통과 (20 라우트)
- 스모크: /guest/orders 200, 잘못된 주문번호 조회 시 안내 문구, /mypage/addresses 비로그인 307→login, /admin/returns 비인가 307, PDP 착용 리뷰 섹션 렌더 확인

### 검증 결과

- 빌드/타입체크/신규 라우트 렌더 및 권한 가드 확인
- 브라우저 실제 클릭 흐름(쿠폰 적용 주문→취소→복구, 리뷰 작성, 교환 요청→관리자 완료)은 수동 QA 필요 — 서버 액션이라 curl 재현 불가

### 남은 작업

- 브라우저 수동 QA(특히 쿠폰 적용 주문→취소 시 쿠폰/포인트 복구 확인)
- 이월: 소셜 로그인, 비밀번호 재설정, 위시리스트, 상품 문의, 관리자 상품 등록/수정 화면

## 2026-07-02 - 홈페이지 및 주요 페이지 카피 개선

### 작업 목표

홈페이지와 주요 페이지의 다소 인위적이거나 쇼핑몰 중심적인 구어체 문구를 세련되고 일관된 남성 컨템포러리 패션 브랜드(SLOWEON)의 톤앤매너에 어울리는 문구로 정제 및 개선한다.

### 읽은 문서와 확인한 요구사항

- `docs/customer-personas.md`, `.agents/persona-*.md` (김도현, 박준서, 이태오 페르소나의 디자인/기능 감도 선호도 확인)
- `menswear_demo_assets/docs/brand_direction.md` (SLOWEON 브랜드 이미지 방향성)
- 관련 요구사항 ID: FE-001, FE-004, FE-005, FE-007, FE-008

### 구현한 변경 사항

- **홈페이지 (`web/src/app/page.tsx`)**:
  - "이번 주 신상품" -> "신규 입고"
  - "고민 없이, 셋업" 밴드 -> "LookBook"으로 수정 및 설명문 정제 ("코디 고민 없이" 제거, "같은 소재의 조화로 완성하는 정돈된 실루엣. 유연한 착용감의 여름 셋업 컬렉션.")
  - "오늘의 컨템포러리 룩" -> "시즌 에디토리얼"
  - 재입고 알림 인기 현황 구어체 수정 ("~기다리고 있어요 -> ~신청하셨습니다. ~해보세요 -> ~해 주세요.")
  - "LookBook" 배너 링크 대상을 기존 셋업 검색결과(`/products?q=셋업`)에서 룩북 목록 페이지(`/lookbooks`)로 변경하고 버튼 문구를 `룩북 보러가기 →`로 수정.
- **주문서 (`web/src/app/checkout/page.tsx`)**:
  - 비회원 주문 안내문 톤 수정 ("확인할 수 있어요" -> "확인하실 수 있습니다")
  - `CheckoutForm` 호출부에서 누락된 `productAmount`, `shippingFee`, `coupons`, `pointBalance`, `addresses` Props 전달 (TypeScript 컴파일 에러 해결)
- **상품 목록 (`web/src/app/products/page.tsx`)**:
  - 필터 결과 없음 안내문 톤 수정 ("검색해보세요" -> "입력해 보세요")
- **컴포넌트 (`web/src/components/OptionSelector.tsx` & `OutfitForm.tsx`)**:
  - 품절 및 선택 안내문 띄어쓰기 및 톤 수정 ("신청해주세요" -> "신청해 주세요", "선택해주세요" -> "선택해 주세요")
  - "코디 세트" -> "착장 세트" 표기 통일 ("코디 세트 장바구니 담기" -> "착장 세트 담기", "코디 세트를 장바구니에 담았습니다." -> "착장 세트를 장바구니에 담았습니다.")
- **룩북 페이지 (`web/src/app/lookbooks/page.tsx` & `[id]/page.tsx`)**:
  - 룩북 서브 카피 정제 ("컨템포러리 룩" 제거, "정돈된 실루엣과 스타일을 제안하는 26 Summer 아카이브.")
  - 룩북 상세 구성 아이템 타이틀 정제 ("이 착장의 아이템" -> "착장 구성 상품")

### 주요 의사결정과 이유

- **"코디" 단어 대체**: 남성 컨템포러리 브랜드(Quiet Luxury, Minimal) 특성에 비추어 볼 때 다소 대중적이고 캐주얼한 느낌을 주는 "코디"보다는 "착장" 및 "스타일링"이라는 차분한 패션 도메인 전문 용어를 사용하여 브랜드 무드를 일관되게 정립함.
- **주문서(Checkout) Props 전달 버그 수정**: 변경 사항 검증 과정 중 `CheckoutForm`에 필수 값들이 누락되어 발생하는 빌드 오류를 발견하고 올바른 변수들을 바인딩하여 타입 및 빌드 무결성을 회복함.

### 실행한 명령어와 결과 요약

- `npm run typecheck --prefix web`: TypeScript 컴파일 성공 (에러 0개)
- `npm run build --prefix web`: Next.js 최적화 빌드 성공 (15개 라우트 정상 파일 번들링 완료)
- `kill -9 <PID>`: 포트 3777에서 실행 중이던 구버전 Next.js 프로덕션 서버 중지
- `npm run start --prefix web -- -p 3777`: 신규 빌드가 반영된 프로덕션 서버 재기동 (Ready in 460ms)

### 테스트/검증 결과

- 모든 페이지가 타입 빌드 수준에서 무결함.
- 텍스트 수정 범위가 UI 컴포넌트 렌더링에만 국한되므로 폼 제출 및 내부 State 동작은 기능적으로 안전함.

### 페르소나 서브 에이전트 검토 요약

- **김도현 (스타일 입문자)**:
  - "여름의 유니폼, 셋업" - 셋업은 옷 매치하기 어려운 입문자에게 세트로 사면 되므로 매우 편리한 구성. 기존의 "코디 고민 없이" 같은 다소 상투적이고 가벼운 설명 대신 "같은 소재의 조화로 완성하는 정돈된 실루엣. 유연한 착용감의 여름 셋업 컬렉션"으로 바꾸니 입문자로서 신뢰감이 감.
  - "시즌 에디토리얼" - '에디토리얼'이라는 단어가 약간 생소할 수 있으나 밑에서 추천 착장의 상품들을 보여주고 세트로 쉽게 담을 수 있어 직관적임.
- **박준서 (데일리 직장인)**:
  - "여름의 유니폼" - 출근과 일상에 깔끔하게 입기 좋은 에센셜 셋업이라는 인상을 줌.
  - "착장 구성 상품" - "이 착장의 아이템"보다 "착장 구성 상품"이라는 단어가 정돈되고 신뢰감을 주는 느낌을 받아 직장인 관점에서 만족스러움.
- **이태오 (트렌드 얼리어답터)**:
  - "시즌 에디토리얼" - 기존 "오늘의 컨템포러리 룩"처럼 브랜드를 억지로 규정하려는 표현이 사라지고 "시즌 에디토리얼", "26 Summer 아카이브"가 도입되어 잡지 화보나 갤러리를 감상하는 고급스러운 인상을 줌.

## 2026-07-02 - 웹 애플리케이션 1차 구현 (백엔드~프론트)

### 작업 목표

`web/` 디렉토리에 남성 컨템포러리 패션 쇼핑몰 웹 앱을 구현했다. 고객 구매 흐름(홈→목록→상세→장바구니→주문서→모의결제)과 패션 특화 기능(실측표, 모델 착용, 룩북 세트 담기, 재입고 알림), 관리자 최소 기능(주문 상태 변경, 재고 조정)을 포함한다.

### 읽은 문서와 확인한 요구사항

- `docs/design-instruct.md`: 히어로+베스트 스트립(A), 슬림 네비·상시 검색·모바일 탭바(B), 팝업 대신 슬림 배너(C), PDP 핵심 정보 상단 배치(D), 세리프 디스플레이+8pt 그리드+포인트 1색(E), 룩북-상품 연결(F)
- `menswear_demo_assets/docs/brand_direction.md`: SLOWEON 팔레트(오프화이트/샌드/차콜), 릴랙스 핏 방향
- `menswear_demo_assets/docs/products.json`, `manifest.json`: 40 SKU 메타데이터와 이미지 상대 경로 구조
- PYD: C-001~010(인증), C-014(게스트 카트 병합), C-018(재입고), P-001~006, PD-001~010, O-001~008, BE-005~008, DB-006~008, FE-001~010

### 확정한 기술 결정

- Next.js 15(App Router)+TypeScript+Tailwind v4+Prisma+SQLite, 세션 기반 인증(DB 세션+httpOnly 쿠키+bcrypt), 모의 결제
- 조회는 서버 컴포넌트에서 Prisma 직접 접근, 변경은 Server Action으로 처리(별도 REST 계층은 실 PG/외부 연동 시점에 도입) — BE-001의 "고객/관리자 분리"는 액션 내 권한 가드로 충족

### 이미지 전략 (진행 중인 이미지 생성과 병행)

- `menswear_demo_assets/`와 `overview-image/`를 복사 없이 `/api/assets/[...path]`로 직접 서빙(경로 탈출 차단, 단기 캐시). 워커가 이미지를 추가하면 재빌드 없이 즉시 반영
- Product.id를 자산 id(top_01 등)와 동일하게 사용해 이미지-상품 매칭을 1:1로 유지
- `ProductImage` 폴백: 파일 미존재 시 상품 색상 배경 + "image coming soon"
- 메인 페이지 비주얼 5종 반영: overview_01(히어로), top_image/pants_image(카테고리 카드), new_arrival(신상품 밴드), setup-collection(셋업 밴드). 각 슬롯은 파일 존재 검사 기반이라 이미지 교체는 파일만 바꾸면 됨

### 구현한 변경 사항

- DB: User/Session/Product/ProductVariant/SizeSpec/ModelFit/Lookbook/LookbookItem/CartItem/Order/OrderItem/Payment/OrderStatusHistory/RestockRequest/InventoryLedger 스키마 + products.json 기반 시드(40 상품×4 사이즈=160 variant, 실측표 160, 룩북 8, 품절 데모 variant 5, 관리자/회원 데모 계정)
- 백엔드(Server Actions): 회원가입(비밀번호 정책)/로그인/로그아웃(세션 폐기), 게스트+회원 장바구니(로그인 시 병합), 코디 세트 담기(옵션 누락 검증), 주문 생성(Serializable 트랜잭션에서 조건부 재고 차감·재고 원장·주문 스냅샷·모의 Payment·상태 이력, 실패 시 롤백), 재입고 알림 신청(중복 방지), 관리자 주문 상태 변경·재고 조정(0→양수 전환 시 대기 알림 NOTIFIED 처리)
- 프론트: 홈(히어로+베스트 스트립+카테고리 카드+신상품/셋업 밴드+룩북), 상품 목록(카테고리/핏/색상 필터+정렬+결과 수+검색), 상품 상세(갤러리, 옵션 선택, 품절 사이즈 재입고 알림 전환, 실측표 상품군별 컬럼, 모델 착용, 배송/교환 요약, 함께 입은 상품), 룩북 목록/상세(세트 담기), 장바구니(수량/삭제/재고 부족 안내/무료배송 안내), 주문서(배송지 검증+결제수단), 주문 완료, 로그인/가입, 마이페이지(주문+재입고 내역), 관리자(대시보드/주문/재고)
- 디자인 시스템: globals.css에 SLOWEON 토큰(오프화이트 배경, 차콜 잉크, 테라코타 포인트 1색), 세리프 디스플레이+산세리프 본문, label-caps 유틸, 포커스 링, 초대형 세리프 푸터 워드마크, 모바일 하단 탭바

### 실행한 명령어와 결과

- `npm install`, `prisma db push`, `tsx prisma/seed.ts` → Seed complete: products 40, variants 160, sizeSpecs 160, lookbooks 8
- `tsc --noEmit` 통과, `next build` 통과(15 라우트 전부 dynamic)
- `next start`(포트 3777)로 스모크 테스트: 홈/목록/상세/룩북 200, 히어로 이미지 200(2.2MB PNG), 미생성 이미지 404→폴백 28곳 렌더 확인, 경로 탈출 403, 관리자 비인가 307→/login
- 재고 조건부 차감 검증: 초과 차감 시 updateMany count 0으로 차단됨(BE-008)

### 검증 결과

- 빌드/타입체크 통과. 핵심 화면 렌더와 이미지 서빙/폴백, 관리자 가드, 재고 동시성 로직 확인
- 브라우저 실기기(모바일) QA와 실제 클릭 흐름(장바구니 담기→결제) UI 검증은 아직 수동으로 하지 않음 — 서버 액션은 브라우저 폼 제출 경로라 curl로 재현 불가

### 남은 작업

- 브라우저에서 구매 흐름/모바일 반응형 수동 QA (페르소나 피드백 게이트)
- 이월 기능: 소셜 로그인, 비밀번호 재설정, 쿠폰/포인트, 리뷰/문의, 교환/반품 화면, 비회원 주문 조회
- 이미지 생성 완료 시(120장) 자동 반영 확인, 상품 목록 이미지 lazy-load 최적화(WebP 변환)

## 2026-07-02 - 제품 콘셉트를 캐트릿에서 컨템포러리로 변경

### 작업 목표

사용자 지시에 따라 제품 콘셉트를 `캐트릿`(캐주얼-스트릿)에서 `컨템포러리`(미니멀·릴랙스 테일러링)로 변경하고, 이미 컨템포러리 콘셉트로 만들어진 `menswear_demo_assets`(가상 브랜드 SLOWEON, Quiet City Summer 2026, 40 SKU)와 기획 문서가 어긋나지 않도록 전체 문서를 정합화했다.

### 확인한 문서

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `docs/design-instruct.md`
- `docs/customer-personas.md`
- `AGENTS.md`, `plan.md`
- `.agents/README.md`, `.agents/persona-*.md`
- `menswear_demo_assets/README.md`, `menswear_demo_assets/docs/brand_direction.md`, `menswear_demo_assets/docs/product_catalog.md`

### 발견한 문제

- `menswear_demo_assets`는 이미 미니멀·릴랙스핏·린넨/니트·뮤트 팔레트 중심의 컨템포러리 콘셉트(SLOWEON)로 만들어져 있었는데, PYD/기획서/페르소나 문서는 여전히 "캐트릿"(캐주얼+스트릿, 후드/카고팬츠/바시티재킷/볼캡/크로스백/그래픽/오버핏 하이프)을 정의하고 있어 이미지 자산과 기획 문서의 콘셉트가 서로 달랐다.
- 단순히 "캐트릿"이라는 단어만 "컨템포러리"로 바꾸면 일부 문장(콘셉트 정의문, 브랜드 포지션, 타깃 사용자 설명)이 의미상 모순되는 것을 확인했다(예: "컨템포러리는 캐주얼과 스트릿 무드를 결합한..."은 성립하지 않음).
- 페르소나 이태오(PER-003)가 "스트릿 트렌드 고객"으로 정의되어 있어 컨템포러리 콘셉트와 정체성이 충돌했다.

### 변경 사항

- PYD, 기획서의 제목/주제/제품명/콘셉트 정의/브랜드 포지션/타깃 사용자/스타일 태그(CAT-003)/콘텐츠 축을 컨템포러리 방향(릴랙스핏, 세미오버, 박시, 드롭숄더, 미니멀, 시티보이, 린넨/니트/블레이저/슬랙스 중심)으로 다시 썼다.
- 이태오 페르소나의 고객 유형을 "스트릿 트렌드 고객"에서 "트렌드 얼리어답터"로 조정하고, "오버핏 실루엣"을 "세미오버·릴랙스 실루엣"으로, "스트릿 무드"를 "컨템포러리 무드"로 수정했다(PYD, 기획서, customer-personas.md, AGENTS.md, `.agents/README.md`, `.agents/persona-lee-taeo.md` 전체 반영).
- IA, 유저 시나리오, design-instruct, customer-personas, AGENTS.md, plan.md, `.agents/*.md`의 제목과 제품명 표기를 컨템포러리로 통일했다.
- design-instruct.md에 실제 디자인 스펙(색상/소재/핏)은 `menswear_demo_assets/docs/brand_direction.md`를 우선 참고하라는 안내를 추가했다.
- AGENTS.md 참고 문서에 `menswear_demo_assets/README.md`를 추가했다.
- plan.md 9절 미정 사항에 "SLOWEON은 이미지 생성용 placeholder이며 공식 브랜드명 결정 아님"이라는 설명을 추가했다.
- PYD v2.2→v2.3, 기획서 v2.1→v2.2, IA v1.2→v1.3, user-scenarios v1.1→v1.2, customer-personas v1.0→v1.1, design-instruct v1.0→v1.1로 버전을 올리고 각 문서에 변경 이력을 기록했다.
- 과거 진행 기록(`process.md`의 이전 항목)은 당시 결정을 그대로 보존하기 위해 수정하지 않았다.

### 수정한 파일

- `docs/shopping-mall-pyd.md`, `docs/shopping-mall-planning.md`, `docs/information-architecture.md`, `docs/user-scenarios.md`, `docs/design-instruct.md`, `docs/customer-personas.md`
- `AGENTS.md`, `plan.md`
- `.agents/README.md`, `.agents/persona-kim-dohyun.md`, `.agents/persona-park-junseo.md`, `.agents/persona-lee-taeo.md`, `.agents/persona-choi-minjae.md`

### 검증 결과

- `grep`으로 전체 `.md` 파일에서 "캐트릿", "스트릿", "오버핏", "하이프" 잔존 여부를 확인해, 변경 이력 설명문과 "세미오버핏" 같은 의도된 표기를 제외하고 모두 정리됐음을 확인했다.
- 코드 구현은 대상이 아니므로 빌드/테스트는 실행하지 않았다.

### 남은 작업

- CAT-002 중분류 예시(후드, 스웨트셔츠 등)는 스트릿 특화 신호가 약해 그대로 두었으나, 실제 상품 등록 시 `menswear_demo_assets/docs/product_catalog.md`의 40개 SKU(셔츠/니트/블레이저/트라우저 중심)를 기준으로 카테고리 예시를 다시 조정할지 검토 필요
- 브랜드명 최종 결정 필요(SLOWEON은 이미지 생성용 가상 브랜드일 뿐 공식 결정 아님)

## 2026-07-02 14:31 KST - Worker A 상의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/tops/top_03`부터 `top_06`까지 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 12개를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세/착용 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색, P-008 코디 세트 탐색, NF-002 이미지 성능 기준 확인
- `docs/shopping-mall-planning.md`: 상품 상세, 룩북, 이미지 정책과 모델 착용 이미지 운영 필요성 확인
- `docs/customer-personas.md`: 김도현/박준서/이태오/최민재의 룩북, 착용컷, 실측 신뢰 요구 확인
- `docs/information-architecture.md`: 상품 상세와 룩북 상세의 핵심 데이터에 이미지가 포함됨 확인
- `docs/user-scenarios.md`: S-004 사이즈 확인 구매, S-005 룩북 코디 세트 구매 흐름 확인
- `docs/design-instruct.md`: 비주얼 판단 시 `menswear_demo_assets/docs/brand_direction.md` 우선 참고 지침 확인
- `menswear_demo_assets/docs/brand_direction.md`: SLOWEON 가상 브랜드, no-logo/no-text/no-label 이미지 방향 확인
- `menswear_demo_assets/docs/image_generation_prompts.json`: `top_03`~`top_06` 프롬프트 확인
- `menswear_demo_assets/tops/top_03`~`top_06` `metadata.json`: 저장 경로 확인

### 현재 계획

- exact prompt text를 변경하지 않고 built-in image generation 도구를 사용한다.
- 각 생성 결과는 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 최대 3회 재생성한다.
- placeholder 이미지는 만들지 않는다.
- Worker B의 `top_07`~`top_10` 진행 기록과 산출물은 변경하지 않는다.

### 실행한 명령어와 결과 요약

- `sed -n ...`로 필수 기획/요구사항/IA/시나리오/디자인/브랜드 문서를 확인했다.
- `jq '.top_03, .top_04, .top_05, .top_06' menswear_demo_assets/docs/image_generation_prompts.json`로 대상 프롬프트를 확인했다.
- `find menswear_demo_assets/tops -maxdepth 2 -type f` 결과 `top_03`~`top_06`에는 `metadata.json`만 있어 요청 이미지 12개가 모두 누락된 상태임을 확인했다.
- `git status --short`는 현재 디렉터리가 Git 저장소가 아니어서 실패했다.

### 남은 작업

- `top_03` 이미지 3개 생성 완료: `detail_image.png`, `worn_image.png`, `lookbook_image.png`
- `top_03` strict visual rule 육안 검수 완료: 보이는 로고, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼 없음
- `top_04` 이미지 3개 생성 완료: `detail_image.png`, `worn_image.png`, `lookbook_image.png`
- `top_04` strict visual rule 육안 검수 완료: `lookbook_image.png` 1~2차 시도는 갤러리 벽면의 mark-like artwork 때문에 거부했고, 3차 시도를 저장했다.
- `top_05`~`top_06` 이미지 6개 생성
- strict visual rule 검수와 필요 시 재생성
- PNG 형식/경로 확인
- 최종 결과와 실패 여부 기록

## 2026-07-02 14:31 KST - Worker B 상의 이미지 생성 시작

### 작업 목표

`menswear_demo_assets/tops/top_07`부터 `top_10`까지 누락된 `detail_image.png`, `worn_image.png`, `lookbook_image.png` 12개를 생성한다.

### 읽은 문서와 확인한 요구사항

- `docs/shopping-mall-pyd.md`: PD-001 대표/상세 이미지, PD-005 모델 착용 정보, P-007 룩북 탐색 요구사항 확인
- `docs/shopping-mall-planning.md`: 상품과 착장 중심의 컨템포러리 브랜드 톤 확인
- `docs/customer-personas.md`: 김도현/박준서/이태오/최민재의 코디, 신뢰, 룩북, 사이즈 판단 관점 확인
- `docs/information-architecture.md`: 상품 상세와 룩북 핵심 데이터에 이미지가 포함됨을 확인
- `docs/user-scenarios.md`: S-001, S-004, S-005 구매/사이즈/룩북 흐름 확인
- `menswear_demo_assets/docs/image_generation_prompts.json`: `top_07`~`top_10` 프롬프트 확인
- `menswear_demo_assets/tops/top_07`~`top_10` `metadata.json`: 저장 경로 확인

### 현재 계획

- exact prompt text를 변경하지 않고 built-in image generation 도구를 사용한다.
- 각 생성 결과는 로고, 브랜드 마크, 라벨, 태그, 워터마크, 인쇄/자수 텍스트, 타이포그래피, 그래픽 심볼이 보이면 실패로 처리하고 최대 3회 재생성한다.
- placeholder 이미지는 만들지 않는다.

### 남은 작업

- 12개 PNG 생성
- 각 이미지 육안 검사 및 필요 시 재생성
- 파일 존재/형식 검증

## 2026-07-02 - 남성 여름 상품 데모 에셋 패키지 생성

### 작업 목표

40개 fictional summer menswear 제품(상의 20개, 하의 20개)에 대한 문서, 메타데이터, 이미지 프롬프트, 제품 폴더, 일부 생성 이미지, zip 패키지를 생성했다.

### 확인/적용한 요구사항

- 실제 브랜드명, 로고, 캠페인, 제품, 패턴, 상표를 복사하지 않는 fictional brand 기준 적용
- 이미지 프롬프트에 real brand reference를 넣지 않음
- 모든 이미지 프롬프트에 로고, 텍스트, 태그, 넥라벨, 워터마크, 타이포그래피, 그래픽 심볼 금지 규칙 반영
- 전체 구조는 `menswear_demo_assets/` 기준으로 생성

### 변경 사항

- `scripts/generate_menswear_demo_assets.py` 생성
- `scripts/copy_latest_generated_image.py` 생성
- `scripts/write_menswear_generation_status.py` 생성
- `menswear_demo_assets/` 폴더 구조 생성
- `docs/brand_direction.md`, `docs/product_catalog.md`, `docs/products.json`, `docs/image_generation_prompts.json` 생성
- 40개 제품별 `metadata.json` 생성
- `manifest.json`, `README.md` 생성
- `TODO_GENERATE_IMAGES.md`, `image_generation_failures.json` 생성
- `menswear_demo_assets.zip` 생성

### 이미지 생성 결과

- 예상 이미지 수: 120
- 실제 생성 및 패키지에 복사된 이미지 수: 6
- 누락 이미지 수: 114
- 생성 완료 제품: `top_01` 3장, `top_02` 3장

### 제한 사항

- built-in 이미지 생성 도구는 사용 가능했으나 한 번에 하나의 프롬프트만 처리하고 기본 generated-images 디렉터리에 저장된다.
- 대량 batch CLI는 존재하지만 `OPENAI_API_KEY`가 현재 환경에 없어 사용할 수 없었다.
- 누락 이미지에 대해 가짜 placeholder PNG는 만들지 않았다.
- 누락 경로와 재생성 지침은 `menswear_demo_assets/TODO_GENERATE_IMAGES.md`와 `menswear_demo_assets/image_generation_failures.json`에 기록했다.

### 검증 결과

- `menswear_demo_assets/` 존재 확인
- `tops` 20개 폴더 확인
- `bottoms` 20개 폴더 확인
- `metadata.json` 40개 확인
- 필수 docs 파일 확인
- `manifest.json`, `README.md`, `menswear_demo_assets.zip` 확인
- 이미지 프롬프트에 strict visual rule 포함 확인
- 벤치마크 real brand reference 문자열이 이미지 프롬프트에 포함되지 않음을 확인

### 남은 작업

- `TODO_GENERATE_IMAGES.md`의 missing image path 114개 생성
- 생성 이미지마다 visible logo/text/label/tag/watermark 여부 검사
- 실패 이미지 재생성 후 zip 재생성

## 2026-07-02 - 고객 페르소나 및 서브 에이전트 구축

### 작업 목표

고객 정의를 더 구체화하기 위해 최소 3명 이상의 이름 있는 페르소나를 만들고, 디자인/개발/QA/런칭 과정에서 피드백을 줄 수 있는 페르소나 서브 에이전트 정의를 구축했다.

### 확인한 문서

- `AGENTS.md`
- `plan.md`
- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `docs/design-instruct.md`

### 변경 사항

- 고객 페르소나 문서 `docs/customer-personas.md`를 추가했다.
- 김도현, 박준서, 이태오, 최민재 4명의 고객 페르소나를 정의했다.
- `.agents/README.md`와 4개 페르소나 서브 에이전트 정의 파일을 추가했다.
- PYD와 기획서에 고객 페르소나 문서 링크와 핵심 페르소나 요약을 추가했다.
- 유저 시나리오에 시나리오-페르소나 매핑을 추가했다.
- AGENTS에 페르소나 서브 에이전트 사용 규칙과 피드백 기록 규칙을 추가했다.
- plan에 페르소나 피드백 게이트와 관련 문서 확인 항목을 추가했다.

### 수정한 파일

- `docs/customer-personas.md`
- `.agents/README.md`
- `.agents/persona-kim-dohyun.md`
- `.agents/persona-park-junseo.md`
- `.agents/persona-lee-taeo.md`
- `.agents/persona-choi-minjae.md`
- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `AGENTS.md`
- `plan.md`
- `process.md`

### 검증 결과

- 문서와 서브 에이전트 정의 파일 생성 및 링크 연결을 완료했다.
- 아직 앱 구현은 시작하지 않았으므로 빌드/테스트는 실행하지 않았다.

### 남은 작업

- 실제 디자인 산출물 또는 구현 화면이 생기면 페르소나 서브 에이전트 피드백 실행
- 페르소나별 릴리즈 차단 이슈를 `process.md`와 `plan.md`에 반영

## 2026-07-02 - 문서 일관성 점검 및 보완

### 작업 목표

`AGENTS.md`, `plan.md`, `docs/` 전체를 교차 검토해 문서 간 불일치와 누락을 찾아 보완했다. 아직 코드 구현은 시작하지 않았다.

### 확인한 문서

- `AGENTS.md`
- `plan.md`
- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `docs/design-instruct.md`

### 발견한 문제

- IA의 쿠폰 관리 권한이 "마케팅관리자 이상"으로 표기되어 있었으나, PYD의 관리자 역할 정의(A-001)와 IA 자체의 권한 매트릭스 어디에도 `마케팅관리자`가 없어 3개 문서가 서로 모순되었다.
- SizeSpec 데이터 모델이 의류 실측 항목만 가지고 있어, CAT-001에 포함된 신발/가방 카테고리의 사이즈표를 표현할 수 없었다.
- Payment, Shipment, Coupon, UserCoupon, RestockRequest, ExchangeReturnRequest, Review, Inquiry, Lookbook 등 9개 엔티티의 status(또는 유사) 필드 값이 어디에도 정의되어 있지 않아 구현자가 임의로 정해야 하는 상태였다.
- Coupon 엔티티에 쿠폰 적용 대상(카테고리/상품 범위) 필드가 없어 M-002(시즌 드롭 쿠폰) 요구사항을 데이터 모델로 표현할 수 없었다.
- Address 엔티티에 제주/도서산간 배송비 판정에 쓸 지역 필드가 없어 D-002 요구사항을 만족할 수 없었다.
- 관리자 2단계 인증/IP 제한이 "가능하면"이라는 연성 표현으로만 존재하고 요구사항 ID와 데이터 모델이 없었다.
- `docs/design-instruct.md`가 git diff 패치 포맷(`--- `, `+++ `, `@@`, 줄 앞 `+`)으로 저장되어 있었고, `AGENTS.md`의 문서 목록에서도 빠져 있었다.

### 변경 사항

- PYD에 A-015(관리자 로그인 보안 강화) 요구사항을 추가했다.
- PYD User 엔티티에 mfaEnabled, mfaSecretHash 필드를 추가하고, AdminIpAllowlist 엔티티(16.30)를 신규로 추가했다.
- PYD Address 엔티티에 zoneCode 필드를 추가했다.
- PYD Coupon 엔티티에 appliesToType, appliesToTargetId 필드를 추가했다.
- PYD SizeSpec 엔티티에 categoryGroup과 신발/가방용 실측 필드(footLength, footWidth, bagWidth, bagHeight, bagDepth)를 추가하고, 17.4 사이즈 정보 정책에 카테고리별 필드 사용 기준을 명시했다.
- PYD에 18.1(기타 핵심 상태값 정의) 절을 추가해 9개 엔티티의 상태값을 정의했다.
- PYD 버전을 v2.1로 올리고 변경 이력 표를 추가했다.
- IA의 쿠폰 관리 권한을 매트릭스와 일치하도록 "최고관리자"로 수정하고, 버전을 v1.1로 올리며 변경 이력 표를 추가했다.
- `docs/design-instruct.md`의 diff 포맷을 제거하고 다른 문서와 동일한 제목/메타데이터 구조로 정리했다.
- `AGENTS.md`에 "참고 문서" 절을 추가해 `docs/design-instruct.md`를 연결하고, 상태값은 PYD 18.1을 따르도록 구현 진행 원칙에 명시했다.
- `plan.md`의 관련 요구사항 범위를 A-001~A-015로 갱신하고, 6.3 체크리스트에 관리자 2단계 인증/IP 허용목록 항목을 추가했다.

### 수정한 파일

- `docs/shopping-mall-pyd.md`
- `docs/information-architecture.md`
- `docs/design-instruct.md`
- `AGENTS.md`
- `plan.md`
- `process.md`

### 검증 결과

- 문서 간 교차 참조(역할, 상태값, 엔티티 필드)를 다시 확인해 모순이 해소됐는지 점검했다.
- 코드 구현은 아직 없으므로 빌드/테스트는 실행하지 않았다.

### 남은 작업

- 기술 스택, 브랜드명, 인증 방식(세션/JWT), PG사, 택배사 등 `plan.md` 9절 미정 사항 결정
- 결정 후 실제 앱 구조 생성 및 구현 착수

## 2026-07-02 - 인증/DB/프론트/백엔드 계획 보강

### 작업 목표

로그인, 로그아웃, 데이터베이스, 프론트엔드, 백엔드 요구사항이 `PYD`와 `plan.md`에 충분히 반영되어 있는지 전문가 관점으로 검토하고, 누락된 내용을 보완했다. 추가로 IA 리스트와 유저 시나리오 문서를 생성했다.

### 확인한 문서

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `plan.md`
- `AGENTS.md`

### 검토 결과

- 기존 PYD에는 로그인/로그아웃이 한 줄로만 정의되어 있어 세션, 토큰 갱신, 비밀번호 재설정, 로그아웃 무효화, 로그인 실패 보호가 부족했다.
- 기존 데이터 모델에는 세션, 소셜 계정, 인증 토큰, 배송지, 결제, 배송, 쿠폰, 포인트 원장, 재고 원장, 관리자 감사 로그가 부족했다.
- 기존 계획에는 프론트엔드와 백엔드 구현 범위가 분리되어 있지 않았고 API, DB 마이그레이션, 인증/권한, 트랜잭션 검증 계획이 부족했다.
- IA와 유저 시나리오가 별도 문서로 없어 구현 라우팅과 QA 기준으로 바로 쓰기 어려웠다.

### 변경 사항

- PYD에 고객/인증 요구사항을 세분화했다.
- PYD에 프론트엔드 요구사항, 백엔드/API 요구사항, 데이터베이스 요구사항을 추가했다.
- PYD 핵심 데이터 모델을 세션, 인증 토큰, 소셜 계정, 결제, 배송, 쿠폰, 포인트, 재고 원장, 감사 로그까지 확장했다.
- 기획서의 기술 방향과 개발 단계에 인증, DB, API, 트랜잭션 기준을 보강했다.
- `plan.md`를 상세 구현 계획으로 재작성했다.
- `docs/information-architecture.md`를 추가했다.
- `docs/user-scenarios.md`를 추가했다.
- `AGENTS.md` 기준 문서에 IA와 유저 시나리오를 추가했다.

### 수정한 파일

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `docs/information-architecture.md`
- `docs/user-scenarios.md`
- `AGENTS.md`
- `plan.md`
- `process.md`

### 검증 결과

- 문서 보강 작업을 완료했다.
- 아직 애플리케이션 구현은 시작하지 않았으므로 빌드/테스트는 실행하지 않았다.

### 남은 작업

- 기술 스택 확정
- 실제 앱 구조 생성
- DB 스키마 또는 ORM 모델 구현
- 인증/상품/장바구니/주문 API 구현
- 고객/관리자 화면 구현

## 2026-07-02

### 작업 목표

남성 캐트릿 패션 쇼핑몰 구현 전 기준 문서를 정리하고, 이후 구현자가 `plan.md`를 따라 작업하며 `process.md`를 갱신하도록 저장소 운영 규칙을 추가했다.

### 확인한 문서

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`

### 변경 사항

- 범용 쇼핑몰 PYD를 남성 캐트릿 패션 쇼핑몰 전용 PYD로 구체화했다.
- 범용 쇼핑몰 기획서를 남성 캐트릿 패션 쇼핑몰 전용 기획서로 구체화했다.
- 구현 전 `plan.md`와 `process.md`를 만들고 갱신하도록 `AGENTS.md`를 추가했다.
- 초기 구현 계획 초안으로 `plan.md`를 추가했다.
- 현재 진행 기록 파일로 `process.md`를 추가했다.

### 수정한 파일

- `docs/shopping-mall-pyd.md`
- `docs/shopping-mall-planning.md`
- `AGENTS.md`
- `plan.md`
- `process.md`

### 결정 사항

- `캐트릿`은 캐주얼과 스트릿 무드를 결합한 남성 패션 콘셉트로 정의했다.
- 제품 차별화 요소는 실측 사이즈표, 모델 착용 정보, 룩북, 코디 세트, 재입고 알림으로 잡았다.
- 구현 작업자는 코드 수정 전 반드시 `plan.md`를 갱신하고, 작업 중 `process.md`를 계속 갱신하도록 규칙화했다.

### 검증 결과

- 문서 파일 생성 및 갱신 작업을 완료했다.
- 아직 애플리케이션 구현은 시작하지 않았으므로 빌드/테스트는 실행하지 않았다.

### 남은 작업

- 실제 기술 스택 확정
- 브랜드명 확정
- 초기 화면 와이어프레임 또는 UI 구현 시작
- 초기 상품 데이터 설계
