import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "관리자" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 관리자 권한 가드 (A-001, FE-001) — 비인가 접근 차단
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b hairline pb-4">
        <div>
          <p className="label-caps">Admin</p>
          <h1 className="display mt-0.5 text-2xl">SLOWEON 운영</h1>
        </div>
        <nav className="flex gap-5 text-xs tracking-wider text-ink-soft">
          <Link href="/admin" className="hover:text-ink">대시보드</Link>
          <Link href="/admin/orders" className="hover:text-ink">주문</Link>
          <Link href="/admin/returns" className="hover:text-ink">교환/반품</Link>
          <Link href="/admin/stock" className="hover:text-ink">재고</Link>
          <Link href="/" className="hover:text-ink">쇼핑몰 →</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
