"use client";

import { useMemo, useState } from "react";
import { prepareOrder } from "@/app/actions/order";
import { won } from "@/lib/format";

const METHODS = [
  { key: "CARD", label: "카드 결제" },
  { key: "EASY_PAY", label: "간편결제" },
  { key: "BANK_TRANSFER", label: "계좌이체" },
];

export type CouponOption = {
  id: string;
  name: string;
  discountType: string; // RATE | AMOUNT
  discountValue: number;
  minOrderAmount: number;
};

export type AddressOption = {
  id: string;
  receiverName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  deliveryMemo: string | null;
  isDefault: boolean;
};

export function CheckoutForm({
  defaultName,
  defaultPhone,
  productAmount,
  shippingFee,
  coupons = [],
  pointBalance = 0,
  addresses = [],
}: {
  defaultName?: string;
  defaultPhone?: string;
  productAmount: number;
  shippingFee: number;
  coupons?: CouponOption[];
  pointBalance?: number;
  addresses?: AddressOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [address, setAddress] = useState<AddressOption | null>(defaultAddress ?? null);
  const [couponId, setCouponId] = useState("");
  const [points, setPoints] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const res = await prepareOrder(formData);
    if (res.error) {
      setError(res.error);
      setPending(false);
      return;
    }

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(clientKey);

      const method = formData.get("method") as string;
      let tossMethod = "CARD";
      if (method === "BANK_TRANSFER") tossMethod = "TRANSFER";

      const customerKey = res.customerEmail
        ? res.customerEmail.replace(/[^a-zA-Z0-9_-]/g, "")
        : "GUEST_" + Math.random().toString(36).substring(2);

      const payment = tossPayments.payment({
        customerKey: customerKey || "GUEST",
      });

      await payment.requestPayment({
        method: tossMethod as any,
        amount: {
          currency: "KRW",
          value: res.finalAmount!,
        },
        orderId: res.orderNumber!,
        orderName: res.productName!,
        successUrl: window.location.origin + "/api/payment/toss/success",
        failUrl: window.location.origin + "/api/payment/toss/fail",
        customerEmail: res.customerEmail || undefined,
        customerName: res.customerName || undefined,
      });
    } catch (err: any) {
      console.error("Toss Payments error:", err);
      setError(err?.message || "결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setPending(false);
    }
  };

  const discount = useMemo(() => {
    const coupon = coupons.find((c) => c.id === couponId);
    if (!coupon || productAmount < coupon.minOrderAmount) return 0;
    return coupon.discountType === "RATE"
      ? Math.floor((productAmount * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, productAmount);
  }, [couponId, coupons, productAmount]);

  const maxPoints = Math.min(pointBalance, productAmount - discount);
  const appliedPoints = Math.min(Math.max(0, points), maxPoints);
  const finalAmount = productAmount - discount - appliedPoints + shippingFee;

  const inputClass =
    "w-full border hairline bg-surface px-3 py-3 text-sm placeholder:text-ink-faint focus:border-line-strong focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <p className="label-caps mb-3">배송지</p>
        {addresses.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAddress(a)}
                aria-pressed={address?.id === a.id}
                className={`border px-3 py-1.5 text-xs transition-colors ${
                  address?.id === a.id ? "border-ink bg-ink text-bg" : "hairline text-ink-soft hover:border-line-strong"
                }`}
              >
                {a.receiverName} · {a.address1.slice(0, 12)}
                {a.isDefault && " (기본)"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddress(null)}
              className={`border px-3 py-1.5 text-xs transition-colors ${
                address === null ? "border-ink bg-ink text-bg" : "hairline text-ink-soft hover:border-line-strong"
              }`}
            >
              직접 입력
            </button>
          </div>
        )}
        <div className="space-y-2.5" key={address?.id ?? "manual"}>
          <div className="grid grid-cols-2 gap-2.5">
            <input name="receiverName" defaultValue={address?.receiverName ?? defaultName} required placeholder="받는 분" className={inputClass} />
            <input name="receiverPhone" defaultValue={address?.phone ?? defaultPhone} required placeholder="휴대폰 번호 (010-0000-0000)" className={inputClass} />
          </div>
          <input name="zipCode" defaultValue={address?.zipCode} required placeholder="우편번호" className={inputClass} />
          <input name="address1" defaultValue={address?.address1} required placeholder="주소" className={inputClass} />
          <input name="address2" defaultValue={address?.address2 ?? undefined} placeholder="상세 주소 (선택)" className={inputClass} />
          <input name="deliveryMemo" defaultValue={address?.deliveryMemo ?? undefined} placeholder="배송 요청사항 (선택)" className={inputClass} />
        </div>
      </section>

      {(coupons.length > 0 || pointBalance > 0) && (
        <section>
          <p className="label-caps mb-3">할인</p>
          <div className="space-y-2.5">
            {coupons.length > 0 && (
              <select
                name="userCouponId"
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className={inputClass}
                aria-label="쿠폰 선택"
              >
                <option value="">쿠폰 선택 안 함</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id} disabled={productAmount < c.minOrderAmount}>
                    {c.name}
                    {c.minOrderAmount > 0 && ` (${c.minOrderAmount.toLocaleString()}원 이상)`}
                  </option>
                ))}
              </select>
            )}
            {pointBalance > 0 && (
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  name="usePoints"
                  min={0}
                  max={maxPoints}
                  value={points || ""}
                  onChange={(e) => setPoints(Number(e.target.value) || 0)}
                  placeholder="사용할 포인트"
                  className={inputClass}
                  aria-label="사용할 포인트"
                />
                <button
                  type="button"
                  onClick={() => setPoints(maxPoints)}
                  className="flex-none border hairline px-3 py-3 text-xs text-ink-soft hover:border-ink"
                >
                  전액 사용
                </button>
              </div>
            )}
            <p className="text-xs text-ink-faint">보유 포인트 {pointBalance.toLocaleString()}P</p>
          </div>
        </section>
      )}

      <section>
        <p className="label-caps mb-3">결제 수단</p>
        <div className="flex gap-2">
          {METHODS.map((m, i) => (
            <label
              key={m.key}
              className="flex-1 cursor-pointer border hairline bg-surface py-3 text-center text-xs has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-bg"
            >
              <input type="radio" name="method" value={m.key} defaultChecked={i === 0} className="sr-only" />
              {m.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          토스페이먼츠 테스트 결제창이 열립니다. 테스트 키 환경에서는 실제로 청구되지 않습니다.
        </p>
      </section>

      {/* 클라이언트 미리보기 금액 — 최종 금액은 서버에서 재계산 (O-005) */}
      <dl className="space-y-1.5 border-y hairline py-4 text-sm">
        <div className="flex justify-between text-ink-soft">
          <dt>상품 금액</dt>
          <dd>{won(productAmount)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-accent">
            <dt>쿠폰 할인</dt>
            <dd>-{won(discount)}</dd>
          </div>
        )}
        {appliedPoints > 0 && (
          <div className="flex justify-between text-accent">
            <dt>포인트 사용</dt>
            <dd>-{won(appliedPoints)}</dd>
          </div>
        )}
        <div className="flex justify-between text-ink-soft">
          <dt>배송비</dt>
          <dd>{shippingFee === 0 ? "무료" : won(shippingFee)}</dd>
        </div>
        <div className="flex justify-between pt-2 text-base font-medium text-ink">
          <dt>최종 결제 금액</dt>
          <dd>{won(finalAmount)}</dd>
        </div>
      </dl>

      <label className="flex items-start gap-2 text-xs text-ink-soft">
        <input type="checkbox" name="agree" className="mt-0.5" />
        <span>
          주문 내용과 교환/반품 정책(사이즈 교환은 배송 완료 후 7일 이내)을 확인했으며 결제 진행에
          동의합니다.
        </span>
      </label>

      {error && <p className="text-sm text-accent">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink py-4 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "결제 처리 중…" : `${won(finalAmount)} 결제하기`}
      </button>
    </form>
  );
}
