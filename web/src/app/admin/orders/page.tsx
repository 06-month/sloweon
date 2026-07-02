import { prisma } from "@/lib/db";
import { updateOrderStatus } from "@/app/actions/admin";
import { won, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "주문 관리" };

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  PAID: [
    { value: "PREPARING", label: "배송 준비" },
    { value: "CANCELLED", label: "주문 취소" },
  ],
  PREPARING: [{ value: "SHIPPED", label: "배송 시작" }],
  SHIPPED: [{ value: "DELIVERED", label: "배송 완료" }],
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true, payment: true, user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="label-caps mb-3">주문 관리 ({orders.length})</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="border hairline bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium">{order.orderNumber}</span>
                <span className="ml-3 text-xs text-ink-soft">
                  {order.createdAt.toLocaleString("ko-KR")} · {order.user?.name ?? "비회원"} ·{" "}
                  {order.receiverName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border hairline px-2.5 py-1 text-xs">
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
                {(NEXT_STATUS[order.status] ?? []).map((next) => (
                  <form key={next.value} action={updateOrderStatus}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="nextStatus" value={next.value} />
                    <button
                      type="submit"
                      className="border border-ink px-2.5 py-1 text-xs transition-colors hover:bg-ink hover:text-bg"
                    >
                      {next.label} →
                    </button>
                  </form>
                ))}
              </div>
            </div>
            <ul className="mt-3 space-y-1 border-t hairline pt-3 text-sm text-ink-soft">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.productNameSnapshot} / {item.colorSnapshot} / {item.sizeSnapshot} ×{" "}
                    {item.quantity}
                  </span>
                  <span>{won(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t hairline pt-3 text-xs text-ink-soft">
              <span>
                {order.address1} {order.address2 ?? ""} · {order.receiverPhone}
              </span>
              <span className="text-sm font-medium text-ink">{won(order.finalAmount)}</span>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="border hairline bg-surface py-12 text-center text-sm text-ink-soft">
            아직 주문이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
