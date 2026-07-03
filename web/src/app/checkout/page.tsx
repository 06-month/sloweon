import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSelectedCartItems, calcShippingFee } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import { CheckoutForm } from "@/components/CheckoutForm";
import { ProductImage } from "@/components/ProductImage";
import { won, effectivePrice } from "@/lib/format";

export const metadata = { title: "주문서" };

export default async function CheckoutPage() {
  // 선택 주문: 장바구니에서 체크된 항목만 주문서에 진입
  const [items, user] = await Promise.all([getSelectedCartItems(), getCurrentUser()]);
  if (items.length === 0) redirect("/cart");

  const productAmount = items.reduce(
    (sum, item) => sum + effectivePrice(item.variant.product) * item.quantity,
    0,
  );
  const shippingFee = calcShippingFee(productAmount);

  // 회원: 사용 가능 쿠폰, 포인트 잔액, 저장된 배송지
  const [userCoupons, pointBalance, addresses] = user
    ? await Promise.all([
        prisma.userCoupon.findMany({
          where: {
            userId: user.id,
            status: "ISSUED",
            coupon: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
          },
          include: { coupon: true },
        }),
        getPointBalance(user.id),
        prisma.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
      ])
    : [[], 0, []];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <p className="label-caps">Checkout</p>
      <h1 className="display mt-1 text-4xl">주문서</h1>
      {!user && (
        <p className="mt-3 border hairline bg-surface px-4 py-3 text-xs text-ink-soft">
          비회원으로 주문합니다.{" "}
          <Link href="/login?next=/checkout" className="underline hover:text-ink">
            로그인
          </Link>
          하면 주문 내역을 마이페이지에서 확인하실 수 있습니다.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckoutForm
          defaultName={user?.name}
          defaultPhone={user?.phone ?? undefined}
          productAmount={productAmount}
          shippingFee={shippingFee}
          coupons={userCoupons.map((uc) => ({
            id: uc.id, // placeOrder는 UserCoupon.id를 기대한다
            name: uc.coupon.name,
            discountType: uc.coupon.discountType,
            discountValue: uc.coupon.discountValue,
            minOrderAmount: uc.coupon.minOrderAmount,
          }))}
          pointBalance={pointBalance}
          addresses={addresses}
        />

        <aside className="h-fit border hairline bg-surface p-6 lg:sticky lg:top-32">
          <p className="label-caps mb-4">주문 상품 {items.length}건</p>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="h-16 w-12 flex-none overflow-hidden">
                  <ProductImage
                    imagePath={item.variant.product.wornImagePath}
                    alt={item.variant.product.koreanName}
                    color={item.variant.product.color}
                  />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate">{item.variant.product.koreanName}</p>
                  <p className="mt-0.5 text-ink-soft">
                    {item.variant.size} · {item.quantity}개
                  </p>
                  <p className="mt-0.5 font-medium">
                    {won(effectivePrice(item.variant.product) * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t hairline pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">상품 금액</dt>
              <dd>{won(productAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">배송비</dt>
              <dd>{shippingFee === 0 ? "무료" : won(shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t hairline pt-3 text-base font-medium">
              <dt>총 결제 금액</dt>
              <dd>{won(productAmount + shippingFee)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
