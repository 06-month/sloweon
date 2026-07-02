"use client";

import { useActionState, useState } from "react";
import { addOutfitToCart, type CartActionState } from "@/app/actions/cart";
import { won } from "@/lib/format";

type OutfitProduct = {
  id: string;
  koreanName: string;
  price: number;
  variants: { id: string; size: string; stock: number }[];
};

/** 룩북 코디 세트 담기 — 각 상품 옵션 개별 선택, 품절 옵션 차단 (O-002, S-005) */
export function OutfitForm({ products }: { products: OutfitProduct[] }) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState<CartActionState, FormData>(addOutfitToCart, null);

  const allSelected = products.every((p) => selection[p.id]);
  const total = products.reduce((sum, p) => sum + p.price, 0);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="expectedCount" value={products.length} />
      {products.map((p) => (
        <div key={p.id} className="border-b hairline pb-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-sm">{p.koreanName}</p>
            <p className="text-sm font-medium">{won(p.price)}</p>
          </div>
          <div className="flex gap-2">
            {p.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => setSelection((s) => ({ ...s, [p.id]: v.id }))}
                aria-pressed={selection[p.id] === v.id}
                className={`min-w-11 border px-3 py-2 text-xs transition-colors ${
                  selection[p.id] === v.id
                    ? "border-ink bg-ink text-bg"
                    : v.stock === 0
                      ? "hairline cursor-not-allowed text-ink-faint line-through"
                      : "hairline hover:border-line-strong"
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>
          {selection[p.id] && <input type="hidden" name="variantId" value={selection[p.id]} />}
        </div>
      ))}

      <div className="flex items-baseline justify-between">
        <p className="label-caps">Set Total</p>
        <p className="text-lg font-medium">{won(total)}</p>
      </div>

      <button
        type="submit"
        disabled={!allSelected || pending}
        className="w-full bg-ink py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "담는 중…" : "착장 세트 담기"}
      </button>
      {!allSelected && <p className="text-xs text-ink-faint">모든 상품의 사이즈를 선택해 주세요.</p>}
      {state?.error && <p className="text-xs text-accent">{state.error}</p>}
      {state?.ok && (
        <p className="text-xs text-success">
          착장 세트를 장바구니에 담았습니다.{" "}
          <a href="/cart" className="underline">장바구니 보기</a>
        </p>
      )}
    </form>
  );
}
