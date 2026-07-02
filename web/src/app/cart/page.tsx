import Link from "next/link";
import { getCartItems, calcShippingFee, FREE_SHIPPING_THRESHOLD } from "@/lib/cart";
import { updateCartQuantity, removeCartItem } from "@/app/actions/cart";
import { ProductImage } from "@/components/ProductImage";
import { won, effectivePrice } from "@/lib/format";

export const metadata = { title: "장바구니" };

export default async function CartPage() {
  const items = await getCartItems();
  const productAmount = items.reduce(
    (sum, item) => sum + effectivePrice(item.variant.product) * item.quantity,
    0,
  );
  const shippingFee = calcShippingFee(productAmount);
  const hasStockIssue = items.some((item) => item.quantity > item.variant.stock);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <p className="label-caps">Cart</p>
      <h1 className="display mt-1 text-4xl">장바구니</h1>

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-2xl">장바구니가 비어 있습니다</p>
          <Link href="/products" className="label-caps mt-6 inline-block underline">
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-5">
            {items.map((item) => {
              const product = item.variant.product;
              const stockShort = item.quantity > item.variant.stock;
              return (
                <li key={item.id} className="flex gap-4 border-b hairline pb-5">
                  <Link href={`/products/${product.id}`} className="h-32 w-24 flex-none overflow-hidden bg-surface">
                    <ProductImage imagePath={product.wornImagePath} alt={product.koreanName} color={product.color} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/products/${product.id}`} className="block truncate text-sm hover:underline">
                          {product.koreanName}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {item.variant.colorName} / {item.variant.size}
                        </p>
                      </div>
                      <form action={removeCartItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button type="submit" aria-label="삭제" className="text-xs text-ink-faint hover:text-ink">
                          삭제
                        </button>
                      </form>
                    </div>

                    {/* 재고 부족 안내 — 주문 전 명확히 (기획서 7.5) */}
                    {stockShort && (
                      <p className="mt-1 text-xs text-accent">
                        재고가 {item.variant.stock}개 남았습니다. 수량을 조정해주세요.
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center border hairline">
                        <form action={updateCartQuantity}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="delta" value={-1} />
                          <button type="submit" className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink" aria-label="수량 줄이기">−</button>
                        </form>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <form action={updateCartQuantity}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="delta" value={1} />
                          <button type="submit" className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink" aria-label="수량 늘리기">+</button>
                        </form>
                      </div>
                      <p className="text-sm font-medium">
                        {won(effectivePrice(product) * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit border hairline bg-surface p-6 lg:sticky lg:top-32">
            <p className="label-caps mb-4">Order Summary</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">상품 금액</dt>
                <dd>{won(productAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">배송비</dt>
                <dd>{shippingFee === 0 ? "무료" : won(shippingFee)}</dd>
              </div>
              {shippingFee > 0 && (
                <p className="text-xs text-ink-faint">
                  {won(FREE_SHIPPING_THRESHOLD - productAmount)} 더 담으면 무료배송
                </p>
              )}
              <div className="flex justify-between border-t hairline pt-3 text-base font-medium">
                <dt>총 결제 금액</dt>
                <dd>{won(productAmount + shippingFee)}</dd>
              </div>
            </dl>
            {hasStockIssue ? (
              <p className="mt-5 text-xs text-accent">재고가 부족한 상품이 있어 주문할 수 없습니다.</p>
            ) : (
              <Link
                href="/checkout"
                className="mt-5 block bg-ink py-3.5 text-center text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85"
              >
                주문하기
              </Link>
            )}
            <Link href="/products" className="mt-3 block text-center text-xs text-ink-soft underline">
              쇼핑 계속하기
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
