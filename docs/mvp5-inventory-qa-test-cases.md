# MVP5 Inventory QA / Chat Product Card Test Cases

작성일: 2026-07-03

## 목적

챗봇 상품 추천/검색/재고 답변에서 상품 링크를 plain text로 노출하지 않고, ProductFactPack 기반 `productCards` payload와 미니 상품 카드 UI로 렌더링되는지 확인한다.

## 공통 확인 기준

- API 응답은 기존 `content` 문자열을 유지하고, 상품 답변에는 `productCards` 배열을 포함한다.
- `productCards`는 ProductFactPack에서 생성된 DB 상품만 포함한다.
- 상품명, 가격, URL, 재고 상태는 DB/ProductVariant 기준과 일치한다.
- RAG-only 상품, LLM 생성 상품명, 추측 이미지 경로로 카드를 만들지 않는다.
- 카드가 생성되면 답변 본문에는 `상품 보기: /products/...` plain text를 넣지 않는다.
- 카드 생성이 불가능한 경우에만 markdown link fallback을 허용한다.
- 정책/주문/환불 차단 답변에는 상품 카드가 없어야 한다.
- `/admin/agent-traces`에서 `productCardsGenerated`, `productCardsCount`, `productCardProductIds`, `missingImageProductIds`, `cardRenderMode`, `linkFallbackReason`을 확인한다.

## 테스트 케이스

| 질문 | 기대 결과 |
|---|---|
| 오프화이트 라이트웨이트 집 니트 자켓 L사이즈 재고 있어? | 해당 상품 카드 1개 표시. DB 이미지가 있으면 이미지 표시, 없으면 placeholder. 요청 L 사이즈가 품절이면 본문 또는 badge에 `L 품절` 표시. |
| 와이드 팬츠 어떤거 있어? | ProductFactPack 기반 추천 카드 3~5개 표시. 각 카드에 상품명, 가격, 상품 보기 버튼 표시. |
| 베이지 와이드 팬츠 있어? | DB 검색 후보와 ProductFactPack에 들어간 관련 상품 카드만 표시. RAG-only 상품 카드 생성 금지. |
| 환불은 어떤 조건에서 가능해? | 정책 답변만 표시. 상품 카드 없음. 자동 환불/결제취소 없음. |
| 주문 취소해줘 | 자동 주문취소 차단 안내. 상품 카드 없음. |

## 브라우저 확인

1. 챗봇을 열고 테스트 질문을 입력한다.
2. 답변 본문 아래에 미니 카드가 나타나는지 확인한다.
3. 카드 이미지가 실제 asset URL이거나 placeholder인지 확인한다.
4. `상품 보기` 버튼 클릭 시 `/products/{productId}` 상세로 이동하는지 확인한다.
5. 모바일 폭에서 카드 텍스트, 이미지, 버튼이 겹치지 않는지 확인한다.

## 배포 환경 확인

로컬에 LLM/embedding/API 환경변수가 없으면 실제 RAG 답변 품질은 배포 환경에서 확인한다.

- `/api/admin/rag-health`
- `/admin/agent-traces`
- 챗봇 상품 질문 3개 이상
- 정책/주문 차단 질문 2개 이상
