"use client";

import { useActionState, useState } from "react";
import { createReview, type ReviewState } from "@/app/actions/review";
import { requestClaim, type ClaimState } from "@/app/actions/claim";

const inputClass =
  "w-full border hairline bg-surface px-3 py-2.5 text-sm placeholder:text-ink-faint focus:border-line-strong focus:outline-none";

const REASONS = [
  { value: "SIZE_SMALL", label: "사이즈가 작아요" },
  { value: "SIZE_LARGE", label: "사이즈가 커요" },
  { value: "COLOR_DIFFERENT", label: "색상이 달라요" },
  { value: "CHANGE_OF_MIND", label: "단순 변심" },
  { value: "DEFECTIVE", label: "상품 불량" },
  { value: "OTHER", label: "기타" },
];

type VariantOption = { id: string; size: string; stock: number };

/** 배송 완료 주문 상품의 후속 행동: 착용 리뷰 작성 / 사이즈 교환 / 반품 */
export function OrderItemActions({
  orderItemId,
  currentSize,
  variants,
  hasReview,
  activeClaim,
  defaultHeight,
  defaultWeight,
}: {
  orderItemId: string;
  currentSize: string;
  variants: VariantOption[];
  hasReview: boolean;
  activeClaim: { requestType: string; status: string } | null;
  defaultHeight?: number;
  defaultWeight?: number;
}) {
  const [open, setOpen] = useState<"review" | "claim" | null>(null);
  const [claimType, setClaimType] = useState<"EXCHANGE" | "RETURN">("EXCHANGE");
  const [rating, setRating] = useState(5);
  const [reviewState, reviewAction, reviewPending] = useActionState<ReviewState, FormData>(createReview, null);
  const [claimState, claimAction, claimPending] = useActionState<ClaimState, FormData>(requestClaim, null);

  const CLAIM_LABEL: Record<string, string> = {
    REQUESTED: "접수됨 · 확인 중",
    APPROVED: "승인됨 · 수거 예정",
    COMPLETED: "처리 완료",
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        {!hasReview && !reviewState?.ok && (
          <button
            type="button"
            onClick={() => setOpen(open === "review" ? null : "review")}
            className="border hairline px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            착용 리뷰 쓰기
          </button>
        )}
        {(hasReview || reviewState?.ok) && <span className="px-1 py-1.5 text-xs text-success">리뷰 작성 완료</span>}
        {activeClaim ? (
          <span className="px-1 py-1.5 text-xs text-ink-soft">
            {activeClaim.requestType === "EXCHANGE" ? "교환" : "반품"} {CLAIM_LABEL[activeClaim.status] ?? activeClaim.status}
          </span>
        ) : claimState?.ok ? (
          <span className="px-1 py-1.5 text-xs text-success">교환/반품 접수 완료</span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(open === "claim" ? null : "claim")}
            className="border hairline px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            교환/반품
          </button>
        )}
      </div>

      {open === "review" && !reviewState?.ok && (
        <form action={reviewAction} className="mt-3 space-y-2.5 border hairline bg-bg p-4">
          <input type="hidden" name="orderItemId" value={orderItemId} />
          <div className="flex items-center gap-3">
            <span className="label-caps">별점</span>
            <div className="flex gap-1" role="radiogroup" aria-label="별점">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-pressed={rating === n}
                  className={`text-lg ${n <= rating ? "text-ink" : "text-line-strong"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <input type="hidden" name="rating" value={rating} />
          </div>
          <div className="flex items-center gap-3">
            <span className="label-caps flex-none">핏 평가</span>
            {[
              { v: "SMALL", l: "작아요" },
              { v: "JUST", l: "정사이즈" },
              { v: "LARGE", l: "커요" },
            ].map((f, i) => (
              <label key={f.v} className="flex items-center gap-1 text-xs">
                <input type="radio" name="fitFeedback" value={f.v} defaultChecked={i === 1} />
                {f.l}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input type="number" name="height" defaultValue={defaultHeight} placeholder="키 (cm, 선택)" className={inputClass} />
            <input type="number" name="weight" defaultValue={defaultWeight} placeholder="몸무게 (kg, 선택)" className={inputClass} />
          </div>
          <textarea name="content" required rows={3} placeholder="핏, 소재, 착용감을 알려주세요 (5자 이상)" className={inputClass} />
          {reviewState?.error && <p className="text-xs text-accent">{reviewState.error}</p>}
          <button
            type="submit"
            disabled={reviewPending}
            className="w-full bg-ink py-2.5 text-xs tracking-[0.2em] text-bg hover:opacity-85 disabled:opacity-50"
          >
            {reviewPending ? "등록 중…" : "리뷰 등록"}
          </button>
        </form>
      )}

      {open === "claim" && !claimState?.ok && !activeClaim && (
        <form action={claimAction} className="mt-3 space-y-2.5 border hairline bg-bg p-4">
          <input type="hidden" name="orderItemId" value={orderItemId} />
          <div className="flex gap-2">
            {(["EXCHANGE", "RETURN"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setClaimType(t)}
                aria-pressed={claimType === t}
                className={`flex-1 border py-2 text-xs transition-colors ${
                  claimType === t ? "border-ink bg-ink text-bg" : "hairline text-ink-soft"
                }`}
              >
                {t === "EXCHANGE" ? "사이즈 교환" : "반품"}
              </button>
            ))}
          </div>
          <input type="hidden" name="requestType" value={claimType} />
          <select name="reasonCode" required className={inputClass} aria-label="사유 선택">
            <option value="">사유 선택</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {claimType === "EXCHANGE" && (
            <div>
              <p className="label-caps mb-1.5">교환할 사이즈 (현재 {currentSize})</p>
              <select name="requestedVariantId" required className={inputClass} aria-label="교환 사이즈 선택">
                <option value="">사이즈 선택</option>
                {variants
                  .filter((v) => v.size !== currentSize)
                  .map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock === 0}>
                      {v.size} {v.stock === 0 ? "(품절)" : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <textarea name="reasonDetail" rows={2} placeholder="상세 사유 (선택)" className={inputClass} />
          {claimState?.error && <p className="text-xs text-accent">{claimState.error}</p>}
          <button
            type="submit"
            disabled={claimPending}
            className="w-full border border-ink py-2.5 text-xs tracking-[0.2em] transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
          >
            {claimPending ? "접수 중…" : `${claimType === "EXCHANGE" ? "교환" : "반품"} 요청하기`}
          </button>
        </form>
      )}
    </div>
  );
}
