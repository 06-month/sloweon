# 구현 계획

문서 상태: 구현 전 상세 계획  
작성일: 2026-07-02  
제품: 남성 컨템포러리 패션 쇼핑몰

## 1. 작업 목표

남성 컨템포러리 패션 쇼핑몰을 프론트엔드, 백엔드, 데이터베이스, 인증/권한, 관리자, 운영 관점에서 빠짐없이 구현하기 위한 계획을 정의한다. 구현자는 코드를 수정하기 전에 이 문서를 현재 작업 범위에 맞게 갱신하고, 진행 중 `process.md`를 계속 갱신한다.

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
