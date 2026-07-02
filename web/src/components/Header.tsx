import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCartItems } from "@/lib/cart";
import { logout } from "@/app/actions/auth";

// 상단 네비: 대분류 최대 6개 (design-instruct B안)
const NAV = [
  { href: "/products", label: "26SS" },
  { href: "/lookbooks", label: "LOOKBOOK" },
  { href: "/products?sale=1", label: "SALE", accent: true },
];

export async function Header() {
  const [user, cartItems] = await Promise.all([getCurrentUser(), getCartItems()]);
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b hairline bg-bg/90 backdrop-blur">
      {/* 혜택 안내는 팝업 대신 슬림 배너 (design-instruct C안) */}
      <div className="border-b hairline bg-ink py-1.5 text-center">
        <p className="text-[11px] tracking-[0.15em] text-bg">
          신규 가입 시 첫 구매 10% 쿠폰 — 26 SUMMER 컬렉션 오픈
        </p>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="display text-2xl lowercase tracking-wide">
          sloweon
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="주요 카테고리">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-xs tracking-[0.18em] transition-colors hover:text-ink ${
                item.accent ? "text-accent" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* 상시 노출 검색 (design-instruct B안) */}
          <form action="/products" className="hidden items-center gap-2 border-b hairline pb-1 lg:flex">
            <input
              type="search"
              name="q"
              placeholder="린넨 셔츠, 와이드 팬츠"
              className="w-44 bg-transparent text-xs placeholder:text-ink-faint focus:outline-none"
              aria-label="상품 검색"
            />
            <button type="submit" aria-label="검색" className="text-ink-soft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>

          {user ? (
            <div className="flex items-center gap-3 text-xs tracking-wider text-ink-soft">
              <Link href={user.role === "ADMIN" ? "/admin" : "/mypage"} className="hover:text-ink">
                {user.role === "ADMIN" ? "ADMIN" : "MY"}
              </Link>
              <form action={logout}>
                <button type="submit" className="hover:text-ink">LOGOUT</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="text-xs tracking-wider text-ink-soft hover:text-ink">
              LOGIN
            </Link>
          )}

          <Link href="/cart" className="relative text-xs tracking-wider text-ink-soft hover:text-ink" aria-label={`장바구니 ${cartCount}개`}>
            CART
            {cartCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] text-bg">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
