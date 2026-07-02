import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import { won, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "마이페이지" };

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mypage");

  const [orders, restockRequests, couponCount, pointBalance] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.restockRequest.findMany({
      where: { userId: user.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userCoupon.count({ where: { userId: user.id, status: "ISSUED" } }),
    getPointBalance(user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <p className="label-caps">My Page</p>
      <h1 className="display mt-1 text-4xl">{user.name}님</h1>
      <p className="mt-2 text-xs text-ink-soft">{user.email}</p>

      {/* 혜택/설정 요약 */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="border hairline bg-surface p-4 text-center">
          <p className="label-caps">Coupon</p>
          <p className="display mt-1 text-2xl">{couponCount}장</p>
        </div>
        <div className="border hairline bg-surface p-4 text-center">
          <p className="label-caps">Point</p>
          <p className="display mt-1 text-2xl">{pointBalance.toLocaleString()}P</p>
        </div>
        <Link href="/mypage/addresses" className="border hairline bg-surface p-4 text-center transition-colors hover:border-line-strong">
          <p className="label-caps">Address</p>
          <p className="mt-2 text-xs text-ink-soft underline underline-offset-4">배송지 관리 →</p>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="label-caps mb-4">주문 내역 ({orders.length})</h2>
        {orders.length === 0 ? (
          <div className="border hairline bg-surface py-14 text-center">
            <p className="text-sm text-ink-soft">아직 주문 내역이 없습니다.</p>
            <Link href="/products" className="label-caps mt-4 inline-block underline">
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/mypage/orders/${order.id}`}
                  className="block border hairline bg-surface p-5 transition-colors hover:border-line-strong"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">{order.orderNumber}</span>
                      <span className="ml-3 text-xs text-ink-soft">
                        {order.createdAt.toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <span className="border hairline px-2.5 py-1 text-xs">
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {order.items[0]?.productNameSnapshot}
                    {order.items.length > 1 && ` 외 ${order.items.length - 1}건`} · {won(order.finalAmount)}
                  </p>
                  <p className="label-caps mt-2">자세히 보기 →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="label-caps mb-4">재입고 알림 신청 ({restockRequests.length})</h2>
        {restockRequests.length === 0 ? (
          <p className="text-sm text-ink-soft">신청한 재입고 알림이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {restockRequests.map((req) => (
              <li key={req.id} className="flex items-center justify-between border hairline bg-surface px-4 py-3 text-sm">
                <Link href={`/products/${req.variant.productId}`} className="hover:underline">
                  {req.variant.product.koreanName} — {req.variant.size}
                </Link>
                <span className={`text-xs ${req.status === "NOTIFIED" ? "text-success" : "text-ink-soft"}`}>
                  {req.status === "NOTIFIED" ? "재입고 완료 · 알림 발송" : "재입고 대기 중"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
