import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { won, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "주문 완료" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
      <p className="label-caps">Thank you</p>
      <h1 className="display mt-2 text-4xl">주문이 완료되었습니다</h1>
      <p className="mt-3 text-sm text-ink-soft">
        주문번호 <strong className="text-ink">{order.orderNumber}</strong>
      </p>

      <div className="mt-10 border hairline bg-surface p-6 text-left">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">주문 상태</dt>
            <dd>{ORDER_STATUS_LABEL[order.status] ?? order.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">받는 분</dt>
            <dd>{order.receiverName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">배송지</dt>
            <dd className="text-right">
              {order.address1} {order.address2 ?? ""}
            </dd>
          </div>
          <div className="border-t hairline pt-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1 text-sm">
                <span className="text-ink-soft">
                  {item.productNameSnapshot} ({item.sizeSnapshot}) × {item.quantity}
                </span>
                <span>{won(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t hairline pt-3 text-base font-medium">
            <dt>결제 금액</dt>
            <dd>{won(order.finalAmount)}</dd>
          </div>
        </dl>
      </div>

      {!order.userId && (
        <p className="mt-4 text-xs text-ink-soft">
          비회원 주문은{" "}
          <Link href="/guest/orders" className="underline hover:text-ink">
            비회원 주문 조회
          </Link>
          에서 주문번호와 휴대폰 번호로 확인할 수 있습니다.
        </p>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/mypage" className="border border-ink px-8 py-3 text-xs tracking-[0.2em] hover:bg-surface">
          주문 내역
        </Link>
        <Link href="/products" className="bg-ink px-8 py-3 text-xs tracking-[0.2em] text-bg hover:opacity-85">
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
