import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteAddress, setDefaultAddress } from "@/app/actions/address";
import { AddressForm } from "@/components/AddressForm";

export const metadata = { title: "배송지 관리" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mypage/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <nav className="mb-6 text-xs text-ink-soft" aria-label="breadcrumb">
        <Link href="/mypage" className="hover:text-ink">MY PAGE</Link>
        <span className="mx-2">/</span>
        <span>배송지 관리</span>
      </nav>
      <p className="label-caps">Address</p>
      <h1 className="display mt-1 text-4xl">배송지 관리</h1>

      <section className="mt-8 space-y-3">
        {addresses.length === 0 && (
          <p className="border hairline bg-surface py-10 text-center text-sm text-ink-soft">
            등록된 배송지가 없습니다. 아래에서 추가해주세요.
          </p>
        )}
        {addresses.map((a) => (
          <div key={a.id} className="border hairline bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">
                  {a.receiverName}
                  {a.isDefault && (
                    <span className="ml-2 border hairline px-1.5 py-0.5 text-[10px] tracking-wider text-ink-soft">
                      기본 배송지
                    </span>
                  )}
                </p>
                <p className="mt-1 text-ink-soft">
                  ({a.zipCode}) {a.address1} {a.address2 ?? ""}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{a.phone}</p>
                {a.deliveryMemo && <p className="mt-0.5 text-xs text-ink-faint">{a.deliveryMemo}</p>}
              </div>
              <div className="flex flex-none gap-2">
                {!a.isDefault && (
                  <form action={setDefaultAddress}>
                    <input type="hidden" name="addressId" value={a.id} />
                    <button type="submit" className="text-xs text-ink-soft underline hover:text-ink">
                      기본으로
                    </button>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="addressId" value={a.id} />
                  <button type="submit" className="text-xs text-ink-faint underline hover:text-accent">
                    삭제
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="label-caps mb-4">새 배송지</h2>
        <AddressForm />
      </section>
    </div>
  );
}
