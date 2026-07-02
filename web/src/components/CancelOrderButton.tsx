"use client";

import { useActionState } from "react";
import { cancelOrder, type CancelState } from "@/app/actions/order";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<CancelState, FormData>(cancelOrder, null);

  if (state?.ok) return <p className="text-xs text-success">주문이 취소되었습니다. 재고와 혜택이 복구됐어요.</p>;

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="border hairline px-4 py-2 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? "취소 처리 중…" : "주문 취소"}
      </button>
      {state?.error && <p className="text-xs text-accent">{state.error}</p>}
    </form>
  );
}
