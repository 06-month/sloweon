# MVP4 RAG 품질 테스트 체크리스트

작성일: 2026-07-03

## 목적

MVP4 "RAG Answer Accuracy & Grounding Improvement"가 상품/가격/재고/정책/리뷰/사이즈 정보를 DB 또는 RAG source에 근거해 답변하는지 확인한다.

## 공통 확인 항목

각 질문 후 `/admin/agent-traces`에서 아래 항목을 확인한다.

- `category`
- `searchProducts` 또는 관련 DB tool 호출 여부
- `ragSources`, `ragSourcesUsed`, `rejectedRagSources`, `lowScoreRagSources`
- `productFactPacks`
- 상품명/가격/상품 URL이 DB ProductFactPack 값과 일치하는지
- `answerUsedDbFacts`, `answerUsedRag`, `hallucinationGuardTriggered`
- `fallbackReason`
- 자동 환불/자동 결제취소/자동 주문취소가 실행 또는 안내되지 않는지

## 테스트 케이스

| 질문 | 기대 category | 기대 DB tool | 기대 RAG source | 통과 기준 |
|---|---|---|---|---|
| 와이드 팬츠 어떤거 있어? | product | searchProducts | product, product_detail, size_guide | 판매 중이고 재고 있는 팬츠만 ProductFactPack에 표시. 가격/URL은 DB 기준 |
| 베이지 와이드 팬츠 있어? | product | searchProducts | product, product_detail | 베이지/와이드 조건이 반영되고 없는 상품명 생성 금지 |
| 여름에 시원한 셔츠 추천해줘 | product | searchProducts | product_detail, brand_guide 가능 | 소재/계절감은 RAG/DB 설명 근거로만 안내 |
| 리뷰 기준으로 크게 나온 바지 있어? | product | searchProducts | review_summary | review_summary 또는 DB 리뷰 집계가 없으면 리뷰 기준 확답 금지 |
| 사이즈가 애매한데 어떻게 골라야 해? | product 또는 other | searchProducts 또는 없음 | size_guide, faq | SizeSpec/ModelFit 근거가 있을 때만 구체 조언 |
| 환불은 어떤 조건에서 가능해? | refund | 없음 | refund_policy, return_policy | 자동 환불 불가, 관리자 승인/상품 확인 필요 안내 |
| 배송은 며칠 걸려? | delivery | 없음 | shipping_policy | 배송 소요는 shipping_policy 근거가 있을 때만 확답 |
| 10만원 이하 바지 추천해줘 | product | searchProducts | product | 가격 필터가 DB 기준으로 적용. 10만원 초과 상품 추천 금지 |
| 품절 상품도 추천해줘 | product | searchProducts | product | 품절 상품은 추천하지 않고 재입고 알림/조건 변경 안내 |
| 주문 취소해줘 | refund | 없음 | faq 또는 return/refund_policy | 챗봇이 자동 주문취소하지 않고 마이페이지/관리자 검토 안내 |

## 수동 판정 기준

- 상품 답변은 번호 목록 형식으로 상품명, 가격, 핏, 소재, 특징, 상품 보기 URL을 포함한다.
- RAG에만 있고 DB productId와 매칭되지 않은 source는 추천 후보가 아니라 `rejectedRagSources`에 남는다.
- 낮은 similarity source는 `lowScoreRagSources`에 남고 최종 답변 근거로 쓰이지 않는다.
- 정책 RAG source가 없으면 정책을 확답하지 않는다.
