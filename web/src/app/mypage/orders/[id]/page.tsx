import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductImage } from "@/components/ProductImage";
import { OrderItemActions } from "@/components/OrderItemActions";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { won, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "주문 상세" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mypage");

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { variants: true } } } },
          review: true,
          claims: { orderBy: { createdAt: "desc" } },
        },
      },
      payment: true,
      statusHistories: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const sizeOrder = ["S", "M", "L", "XL"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <nav className="mb-6 text-xs text-ink-soft" aria-label="breadcrumb">
        <Link href="/mypage" className="hover:text-ink">MY PAGE</Link>
        <span className="mx-2">/</span>
        <span>{order.orderNumber}</span>
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label-caps">Order</p>
          <h1 className="display mt-1 text-3xl">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-ink-soft">{order.createdAt.toLocaleString("ko-KR")}</p>
        </div>
        <span className="border hairline px-3 py-1.5 text-sm">
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* 주문 상품 + 배송 완료 후 액션 (리뷰/교환/반품) */}
      <section className="mt-8 space-y-4">
        {order.items.map((item) => {
          const activeClaim = item.claims.find((c) => c.status !== "REJECTED") ?? null;
          return (
            <div key={item.id} className="border hairline bg-surface p-4">
              <div className="flex gap-4">
                <Link href={`/products/${item.productId}`} className="h-24 w-18 flex-none overflow-hidden" style={{ width: 72 }}>
                  <ProductImage
                    imagePath={item.variant.product.wornImagePath}
                    alt={item.productNameSnapshot}
                    color={item.variant.product.color}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.productId}`} className="block truncate text-sm hover:underline">
                    {item.productNameSnapshot}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {item.colorSnapshot} / {item.sizeSnapshot} × {item.quantity}
                  </p>
                  <p className="mt-1 text-sm font-medium">{won(item.totalPrice)}</p>
                  {order.status === "DELIVERED" && (
                    <OrderItemActions
                      orderItemId={item.id}
                      currentSize={item.sizeSnapshot}
                      variants={[...item.variant.product.variants]
                        .sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))
                        .map((v) => ({ id: v.id, size: v.size, stock: v.stock }))}
                      hasReview={!!item.review}
                      activeClaim={activeClaim ? { requestType: activeClaim.requestType, status: activeClaim.status } : null}
                      defaultHeight={user.height ?? undefined}
                      defaultWeight={user.weight ?? undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 금액 */}
      <section className="mt-8 border hairline bg-surface p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">상품 금액</dt>
            <dd>{won(order.totalProductAmount)}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-accent">
              <dt>쿠폰 할인</dt>
              <dd>-{won(order.discountAmount)}</dd>
            </div>
          )}
          {order.pointUsedAmount > 0 && (
            <div className="flex justify-between text-accent">
              <dt>포인트 사용</dt>
              <dd>-{won(order.pointUsedAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">배송비</dt>
            <dd>{order.shippingFee === 0 ? "무료" : won(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t hairline pt-3 text-base font-medium">
            <dt>결제 금액</dt>
            <dd>{won(order.finalAmount)}</dd>
          </div>
        </dl>
      </section>

      {/* 배송지 */}
      <section className="mt-4 border hairline bg-surface p-5 text-sm">
        <p className="label-caps mb-2">배송지</p>
        <p>{order.receiverName} · {order.receiverPhone}</p>
        <p className="mt-0.5 text-ink-soft">
          ({order.zipCode}) {order.address1} {order.address2 ?? ""}
        </p>
        {order.deliveryMemo && <p className="mt-0.5 text-xs text-ink-faint">{order.deliveryMemo}</p>}
      </section>

      {/* 상태 이력 */}
      <section className="mt-4 border hairline bg-surface p-5 text-sm">
        <p className="label-caps mb-2">진행 상태</p>
        <ul className="space-y-1 text-xs text-ink-soft">
          {order.statusHistories.map((h) => (
            <li key={h.id} className="flex justify-between">
              <span>{ORDER_STATUS_LABEL[h.nextStatus] ?? h.nextStatus}</span>
              <span>{h.createdAt.toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 결제 완료 상태에서만 취소 가능 (O-008) */}
      {order.status === "PAID" && (
        <div className="mt-6">
          <CancelOrderButton orderId={order.id} />
          <p className="mt-1.5 text-xs text-ink-faint">배송 준비가 시작되면 취소할 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}
