"use client";

import { useActionState } from "react";
import { createAddress, type AddressState } from "@/app/actions/address";

const inputClass =
  "w-full border hairline bg-surface px-3 py-3 text-sm placeholder:text-ink-faint focus:border-line-strong focus:outline-none";

export function AddressForm() {
  const [state, formAction, pending] = useActionState<AddressState, FormData>(createAddress, null);

  return (
    <form action={formAction} className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <input name="receiverName" required placeholder="받는 분" className={inputClass} />
        <input name="phone" required placeholder="휴대폰 번호" className={inputClass} />
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2.5">
        <input name="zipCode" required placeholder="우편번호" className={inputClass} />
        <input name="address1" required placeholder="주소" className={inputClass} />
      </div>
      <input name="address2" placeholder="상세 주소 (선택)" className={inputClass} />
      <input name="deliveryMemo" placeholder="배송 요청사항 (선택)" className={inputClass} />
      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" name="isDefault" />
        기본 배송지로 설정
      </label>
      {state?.error && <p className="text-xs text-accent">{state.error}</p>}
      {state?.ok && <p className="text-xs text-success">배송지를 저장했습니다.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-ink py-3 text-xs tracking-[0.2em] transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
      >
        {pending ? "저장 중…" : "배송지 추가"}
      </button>
    </form>
  );
}
