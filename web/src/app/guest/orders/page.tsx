import { prisma } from "@/lib/db";
import { won, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "비회원 주문 조회" };

/** 비회원 주문 조회 (C-013): 주문번호 + 주문 시 입력한 휴대폰 번호로 인증 */
export default async function GuestOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string; phone?: string }>;
}) {
  const { number, phone } = await searchParams;
  const normalizedPhone = (phone ?? "").replace(/-/g, "");

  const order =
    number && normalizedPhone
      ? await prisma.order.findFirst({
          where: { orderNumber: number.trim() },
          include: { items: true },
        })
      : null;
  // 휴대폰 번호 일치 검증 (하이픈 무시) — 해당 주문에만 접근 가능 (S-006)
  const verified = order && order.receiverPhone.replace(/-/g, "") === normalizedPhone ? order : null;

  const inputClass =
    "w-full border hairline bg-surface px-3 py-3 text-sm placeholder:text-ink-faint focus:border-line-strong focus:outline-none";

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:px-6">
      <p className="label-caps text-center">Guest Order</p>
      <h1 className="display mt-1 text-center text-4xl">비회원 주문 조회</h1>
      <p className="mt-3 text-center text-xs text-ink-soft">
        주문번호와 주문 시 입력한 휴대폰 번호를 입력해주세요.
      </p>

      <form method="GET" className="mt-8 space-y-2.5">
        <input name="number" defaultValue={number} required placeholder="주문번호 (SW20260702-XXXXXX)" className={inputClass} />
        <input name="phone" defaultValue={phone} required placeholder="휴대폰 번호" className={inputClass} />
        <button
          type="submit"
          className="w-full bg-ink py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85"
        >
          주문 조회
        </button>
      </form>

      {number && normalizedPhone && !verified && (
        <p className="mt-6 border hairline bg-surface px-4 py-3 text-center text-xs text-accent">
          일치하는 주문을 찾을 수 없습니다. 주문번호와 휴대폰 번호를 확인해주세요.
        </p>
      )}

      {verified && (
        <div className="mt-8 border hairline bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">{verified.orderNumber}</p>
            <span className="border hairline px-2.5 py-1 text-xs">
              {ORDER_STATUS_LABEL[verified.status] ?? verified.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{verified.createdAt.toLocaleString("ko-KR")}</p>
          <ul className="mt-3 space-y-1 border-t hairline pt-3 text-sm text-ink-soft">
            {verified.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.productNameSnapshot} ({item.sizeSnapshot}) × {item.quantity}
                </span>
                <span>{won(item.totalPrice)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t hairline pt-3 text-sm font-medium">
            <span>결제 금액</span>
            <span>{won(verified.finalAmount)}</span>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            {verified.receiverName} · ({verified.zipCode}) {verified.address1} {verified.address2 ?? ""}
          </p>
        </div>
      )}
    </div>
  );
}
