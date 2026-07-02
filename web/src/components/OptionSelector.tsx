"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, type CartActionState } from "@/app/actions/cart";
import { requestRestock, type RestockState } from "@/app/actions/restock";
import { won } from "@/lib/format";

type VariantView = { id: string; size: string; stock: number };

export function OptionSelector({
  variants,
  price,
  isLoggedIn,
}: {
  variants: VariantView[];
  price: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<VariantView | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartState, cartAction, cartPending] = useActionState<CartActionState, FormData>(addToCart, null);
  const [restockState, restockAction, restockPending] = useActionState<RestockState, FormData>(
    requestRestock,
    null,
  );

  const soldOut = selected !== null && selected.stock === 0;

  return (
    <div className="space-y-5">
      {/* 사이즈 선택 — 품절 옵션은 선택 가능하되 구매 대신 재입고 알림 제공 (P-006, FE-006) */}
      <div>
        <p className="label-caps mb-2">Size</p>
        <div className="flex gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setSelected(v);
                setQuantity(1);
              }}
              aria-pressed={selected?.id === v.id}
              className={`relative min-w-12 border px-4 py-2.5 text-sm transition-colors ${
                selected?.id === v.id
                  ? "border-ink bg-ink text-bg"
                  : v.stock === 0
                    ? "hairline text-ink-faint line-through"
                    : "hairline hover:border-line-strong"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
        {selected && selected.stock > 0 && selected.stock <= 3 && (
          <p className="mt-2 text-xs text-accent">품절 임박 — {selected.stock}개 남음</p>
        )}
        {soldOut && <p className="mt-2 text-xs text-ink-soft">품절된 사이즈입니다. 재입고 알림을 신청해 주세요.</p>}
      </div>

      {!soldOut && (
        <div className="flex items-center gap-4">
          <p className="label-caps">Qty</p>
          <div className="flex items-center border hairline">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-sm text-ink-soft hover:text-ink"
              aria-label="수량 줄이기"
            >
              −
            </button>
            <span className="w-8 text-center text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => (selected ? Math.min(selected.stock, q + 1) : q + 1))}
              className="px-3 py-2 text-sm text-ink-soft hover:text-ink"
              aria-label="수량 늘리기"
            >
              +
            </button>
          </div>
          {selected && (
            <p className="ml-auto text-sm font-medium">{won(price * quantity)}</p>
          )}
        </div>
      )}

      {/* 구매/재입고 액션 */}
      {soldOut ? (
        <form action={restockAction} className="space-y-2">
          <input type="hidden" name="variantId" value={selected.id} />
          {!isLoggedIn && (
            <input
              type="email"
              name="guestEmail"
              required
              placeholder="알림 받을 이메일"
              className="w-full border hairline bg-surface px-3 py-3 text-sm placeholder:text-ink-faint"
            />
          )}
          <button
            type="submit"
            disabled={restockPending || restockState?.ok}
            className="w-full border border-ink py-3.5 text-xs tracking-[0.2em] transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
          >
            {restockState?.ok ? "재입고 알림 신청 완료" : restockPending ? "신청 중…" : "재입고 알림 신청"}
          </button>
          {restockState?.error && <p className="text-xs text-accent">{restockState.error}</p>}
        </form>
      ) : (
        <form action={cartAction} className="space-y-2">
          <input type="hidden" name="variantId" value={selected?.id ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!selected || cartPending}
              className="flex-1 border border-ink py-3.5 text-xs tracking-[0.2em] transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cartPending ? "담는 중…" : "장바구니"}
            </button>
            <button
              type="button"
              disabled={!selected || cartPending}
              onClick={async () => {
                if (!selected) return;
                const fd = new FormData();
                fd.set("variantId", selected.id);
                fd.set("quantity", String(quantity));
                const result = await addToCart(null, fd);
                if (result?.ok) router.push("/checkout");
              }}
              className="flex-1 bg-ink py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              바로 구매
            </button>
          </div>
          {!selected && <p className="text-xs text-ink-faint">사이즈를 선택해 주세요.</p>}
          {cartState?.error && <p className="text-xs text-accent">{cartState.error}</p>}
          {cartState?.ok && (
            <p className="text-xs text-success">
              장바구니에 담았습니다.{" "}
              <a href="/cart" className="underline">
                장바구니 보기
              </a>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
