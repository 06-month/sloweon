import Link from "next/link";
import { prisma } from "@/lib/db";
import { won } from "@/lib/format";

export default async function AdminDashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayOrders, preparingCount, soldOutVariants, restockWaiting, recentOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { finalAmount: true },
    }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.productVariant.count({ where: { stock: 0 } }),
    prisma.restockRequest.count({ where: { status: "REQUESTED" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: true } }),
  ]);

  const cards = [
    { label: "오늘 주문", value: `${todayOrders._count}건`, sub: won(todayOrders._sum.finalAmount ?? 0), href: "/admin/orders" },
    { label: "배송 준비 필요", value: `${preparingCount}건`, sub: "결제 완료 상태", href: "/admin/orders" },
    { label: "품절 옵션", value: `${soldOutVariants}개`, sub: "재고 0 variant", href: "/admin/stock" },
    { label: "재입고 대기", value: `${restockWaiting}건`, sub: "알림 신청", href: "/admin/stock" },
  ];

  return (
    <div>
      {/* 오늘 처리할 운영 업무 우선 (기획서 7.8) */}
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="border hairline bg-surface p-5 transition-colors hover:border-line-strong">
            <p className="label-caps">{c.label}</p>
            <p className="display mt-2 text-3xl">{c.value}</p>
            <p className="mt-1 text-xs text-ink-soft">{c.sub}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="label-caps mb-3">최근 주문</h2>
        <div className="overflow-x-auto border hairline bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b hairline text-left text-xs text-ink-soft">
                <th className="px-4 py-3 font-medium">주문번호</th>
                <th className="px-4 py-3 font-medium">상품</th>
                <th className="px-4 py-3 font-medium">금액</th>
                <th className="px-4 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b hairline last:border-0">
                  <td className="px-4 py-3">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {o.items[0]?.productNameSnapshot}
                    {o.items.length > 1 && ` 외 ${o.items.length - 1}건`}
                  </td>
                  <td className="px-4 py-3">{won(o.finalAmount)}</td>
                  <td className="px-4 py-3">{o.status}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                    아직 주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
