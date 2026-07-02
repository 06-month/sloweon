import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t hairline pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-10 text-xs text-ink-soft md:grid-cols-3">
          <div className="space-y-2">
            <p className="label-caps">Customer Center</p>
            <p>평일 10:00 – 17:00 (주말·공휴일 휴무)</p>
            <p>help@sloweon.demo</p>
            <Link href="/guest/orders" className="inline-block underline underline-offset-4 hover:text-ink">
              비회원 주문 조회
            </Link>
          </div>
          <div className="space-y-2">
            <p className="label-caps">Shop</p>
            <div className="flex flex-col gap-1">
              <Link href="/products?category=top" className="hover:text-ink">상의</Link>
              <Link href="/products?category=bottom" className="hover:text-ink">하의</Link>
              <Link href="/lookbooks" className="hover:text-ink">룩북</Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="label-caps">Policy</p>
            <p>배송비 3,000원 · 10만원 이상 무료배송</p>
            <p>사이즈 교환은 배송 완료 후 7일 이내 접수</p>
            <p className="text-ink-faint">본 사이트는 데모이며 실제 판매하지 않습니다.</p>
          </div>
        </div>
      </div>
      {/* 초대형 세리프 워드마크 — 시그니처 타이포 모먼트 (design-instruct E안) */}
      <div className="overflow-hidden px-4 pb-6">
        <p className="display select-none text-center text-[clamp(4rem,18vw,14rem)] lowercase leading-none text-ink/85">
          sloweon
        </p>
      </div>
    </footer>
  );
}
