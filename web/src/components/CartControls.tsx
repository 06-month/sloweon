"use client";

import { useOptimistic, useTransition } from "react";
import {
  updateCartQuantity,
  toggleCartItemSelected,
  setAllCartSelected,
  removeCartItem,
} from "@/app/actions/cart";

/**
 * 장바구니 컨트롤 — 낙관적 UI (useOptimistic).
 * 클릭 즉시 화면에 반영하고 서버 액션은 백그라운드에서 처리한다.
 * 서버 처리 후 페이지 RSC 갱신으로 실제 값과 동기화된다.
 */

export function QuantityControl({
  itemId,
  quantity,
  maxStock,
}: {
  itemId: string;
  quantity: number;
  maxStock: number;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticQty, setOptimisticQty] = useOptimistic(quantity);

  const change = (delta: number) => {
    startTransition(async () => {
      setOptimisticQty((q) => Math.max(1, Math.min(maxStock, q + delta)));
      const fd = new FormData();
      fd.set("itemId", itemId);
      fd.set("delta", String(delta));
      await updateCartQuantity(fd);
    });
  };

  return (
    <div className="flex items-center border hairline" data-pending={pending || undefined}>
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={optimisticQty <= 1}
        className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink disabled:opacity-30"
        aria-label="수량 줄이기"
      >
        −
      </button>
      <span className={`w-8 text-center text-sm ${pending ? "opacity-50" : ""}`}>{optimisticQty}</span>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={optimisticQty >= maxStock}
        className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink disabled:opacity-30"
        aria-label="수량 늘리기"
      >
        +
      </button>
    </div>
  );
}

export function SelectToggle({
  itemId,
  selected,
  label,
}: {
  itemId: string;
  selected: boolean;
  label: string;
}) {
  const [, startTransition] = useTransition();
  const [optimisticSelected, setOptimisticSelected] = useOptimistic(selected);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticSelected}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          setOptimisticSelected((s) => !s);
          const fd = new FormData();
          fd.set("itemId", itemId);
          await toggleCartItemSelected(fd);
        })
      }
      className={`flex h-5 w-5 items-center justify-center border text-xs transition-colors ${
        optimisticSelected ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface hover:border-ink"
      }`}
    >
      {optimisticSelected ? "✓" : ""}
    </button>
  );
}

export function SelectAllToggle({
  allSelected,
  selectedCount,
  totalCount,
}: {
  allSelected: boolean;
  selectedCount: number;
  totalCount: number;
}) {
  const [, startTransition] = useTransition();
  const [optimisticAll, setOptimisticAll] = useOptimistic(allSelected);

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          setOptimisticAll((s) => !s);
          const fd = new FormData();
          fd.set("selected", allSelected ? "false" : "true");
          await setAllCartSelected(fd);
        })
      }
      className="flex items-center gap-2 text-xs text-ink-soft hover:text-ink"
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 items-center justify-center border text-[10px] ${
          optimisticAll ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface"
        }`}
      >
        {optimisticAll ? "✓" : ""}
      </span>
      전체 선택 ({selectedCount}/{totalCount})
    </button>
  );
}

export function RemoveButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData();
          fd.set("itemId", itemId);
          await removeCartItem(fd);
        })
      }
      disabled={pending}
      aria-label="삭제"
      className="text-xs text-ink-faint hover:text-ink disabled:opacity-40"
    >
      {pending ? "삭제 중" : "삭제"}
    </button>
  );
}
