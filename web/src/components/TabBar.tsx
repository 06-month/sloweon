import Link from "next/link";

// 모바일 하단 탭바 — 반투명 처리로 콘텐츠 가림 최소화 (design-instruct B안)
const TABS = [
  { href: "/", label: "홈" },
  { href: "/products", label: "상품" },
  { href: "/lookbooks", label: "룩북" },
  { href: "/cart", label: "장바구니" },
  { href: "/mypage", label: "마이" },
];

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-bg/92 backdrop-blur md:hidden"
      aria-label="모바일 하단 메뉴"
    >
      <ul className="flex justify-around py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link href={tab.href} className="px-3 py-1 text-[11px] tracking-widest text-ink-soft">
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
