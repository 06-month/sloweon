import Link from "next/link";
import { getCartItems, calcShippingFee, FREE_SHIPPING_THRESHOLD } from "@/lib/cart";
import { QuantityControl, SelectToggle, SelectAllToggle, RemoveButton } from "@/components/CartControls";
import { ProductImage } from "@/components/ProductImage";
import { won, effectivePrice } from "@/lib/format";

export const metadata = { title: "장바구니" };

export default async function CartPage() {
  const items = await getCartItems();
  const selectedItems = items.filter((item) => item.selected);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  // 금액/재고 검증은 선택된 항목 기준 (선택 주문)
  const productAmount = selectedItems.reduce(
    (sum, item) => sum + effectivePrice(item.variant.product) * item.quantity,
    0,
  );
  const shippingFee = calcShippingFee(productAmount);
  const hasStockIssue = selectedItems.some((item) => item.quantity > item.variant.stock);

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
          <div>
            <div className="mb-4 flex items-center justify-between border-b hairline pb-3">
              <SelectAllToggle
                allSelected={allSelected}
                selectedCount={selectedItems.length}
                totalCount={items.length}
              />
            </div>

            <ul className="space-y-5">
              {items.map((item) => {
                const product = item.variant.product;
                const stockShort = item.quantity > item.variant.stock;
                return (
                  <li key={item.id} className={`flex gap-3 border-b hairline pb-5 ${item.selected ? "" : "opacity-50"}`}>
                    {/* 선택 체크박스 — 체크된 상품만 주문서로 진입 (낙관적 반영) */}
                    <div className="flex-none pt-1">
                      <SelectToggle itemId={item.id} selected={item.selected} label={`${product.koreanName} 주문 선택`} />
                    </div>

                    <Link href={`/products/${product.id}`} className="h-32 w-24 flex-none overflow-hidden bg-surface">
                      <ProductImage imagePath={product.wornImagePath} alt={product.koreanName} color={product.color} sizes="96px" />
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
                        <RemoveButton itemId={item.id} />
                      </div>

                      {stockShort && (
                        <p className="mt-1 text-xs text-accent">
                          재고가 {item.variant.stock}개 남았습니다. 수량을 조정해주세요.
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <QuantityControl itemId={item.id} quantity={item.quantity} maxStock={item.variant.stock} />
                        <p className="text-sm font-medium">
                          {won(effectivePrice(product) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="h-fit border hairline bg-surface p-6 lg:sticky lg:top-32">
            <p className="label-caps mb-4">Order Summary</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">선택 상품 ({selectedItems.length}개)</dt>
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
            {selectedItems.length === 0 ? (
              <p className="mt-5 text-center text-xs text-ink-soft">주문할 상품을 선택해주세요.</p>
            ) : hasStockIssue ? (
              <p className="mt-5 text-xs text-accent">선택한 상품 중 재고가 부족한 상품이 있습니다.</p>
            ) : (
              <Link
                href="/checkout"
                className="mt-5 block bg-ink py-3.5 text-center text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85"
              >
                선택 상품 주문하기 ({selectedItems.length})
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
