import { prisma } from "@/lib/db";
import { processClaim } from "@/app/actions/admin";
import { won } from "@/lib/format";

export const metadata = { title: "교환/반품 관리" };

const REASON_LABEL: Record<string, string> = {
  SIZE_SMALL: "사이즈 작음",
  SIZE_LARGE: "사이즈 큼",
  COLOR_DIFFERENT: "색상 차이",
  CHANGE_OF_MIND: "단순 변심",
  DEFECTIVE: "상품 불량",
  OTHER: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "접수됨",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  COMPLETED: "완료",
};

export default async function AdminReturnsPage() {
  const claims = await prisma.exchangeReturnRequest.findMany({
    include: {
      orderItem: { include: { order: true } },
      requestedVariant: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="label-caps mb-1">교환/반품 관리 ({claims.length})</h2>
      <p className="mb-4 text-xs text-ink-soft">
        완료 처리 시 반품은 재고가 복구되고, 교환은 기존 옵션 복구 + 새 옵션 차감이 함께 처리됩니다.
      </p>
      <div className="space-y-3">
        {claims.map((claim) => (
          <div key={claim.id} className="border hairline bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="mr-2 border hairline px-2 py-0.5 text-xs">
                  {claim.requestType === "EXCHANGE" ? "교환" : "반품"}
                </span>
                <span className="font-medium">{claim.orderItem.productNameSnapshot}</span>
                <span className="ml-2 text-xs text-ink-soft">
                  {claim.orderItem.colorSnapshot} / {claim.orderItem.sizeSnapshot} × {claim.orderItem.quantity}
                  {claim.requestType === "EXCHANGE" && claim.requestedVariant && (
                    <> → <strong className="text-ink">{claim.requestedVariant.size}</strong> (재고 {claim.requestedVariant.stock})</>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border hairline px-2.5 py-1 text-xs">{STATUS_LABEL[claim.status]}</span>
                {claim.status === "REQUESTED" && (
                  <>
                    <form action={processClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="action" value="APPROVE" />
                      <button type="submit" className="border border-ink px-2.5 py-1 text-xs hover:bg-ink hover:text-bg">
                        승인
                      </button>
                    </form>
                    <form action={processClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="action" value="REJECT" />
                      <button type="submit" className="border hairline px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent">
                        거절
                      </button>
                    </form>
                  </>
                )}
                {claim.status === "APPROVED" && (
                  <form action={processClaim}>
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="action" value="COMPLETE" />
                    <button type="submit" className="bg-ink px-2.5 py-1 text-xs text-bg hover:opacity-85">
                      완료 처리
                    </button>
                  </form>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              주문 {claim.orderItem.order.orderNumber} · {won(claim.orderItem.totalPrice)} · 사유:{" "}
              {REASON_LABEL[claim.reasonCode] ?? claim.reasonCode}
              {claim.reasonDetail && ` — ${claim.reasonDetail}`} · {claim.createdAt.toLocaleString("ko-KR")}
            </p>
          </div>
        ))}
        {claims.length === 0 && (
          <p className="border hairline bg-surface py-12 text-center text-sm text-ink-soft">
            접수된 교환/반품 요청이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
