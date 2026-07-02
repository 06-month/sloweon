import { prisma } from "@/lib/db";
import { adjustStock } from "@/app/actions/admin";

export const metadata = { title: "재고 관리" };

export default async function AdminStockPage() {
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: { sku: "asc" },
        include: { _count: { select: { restockRequests: { where: { status: "REQUESTED" } } } } },
      },
    },
    orderBy: { id: "asc" },
  });

  const sizeOrder = ["S", "M", "L", "XL"];

  return (
    <div>
      <h2 className="label-caps mb-1">옵션/재고 관리</h2>
      <p className="mb-4 text-xs text-ink-soft">
        재고를 0에서 올리면 해당 옵션의 재입고 알림 신청이 발송 완료 처리됩니다.
      </p>
      <div className="overflow-x-auto border hairline bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b hairline text-left text-xs text-ink-soft">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">사이즈</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">재고</th>
              <th className="px-4 py-3 font-medium">재입고 신청</th>
              <th className="px-4 py-3 font-medium">조정</th>
            </tr>
          </thead>
          <tbody>
            {products.flatMap((p) =>
              [...p.variants]
                .sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))
                .map((v, i) => (
                  <tr key={v.id} className="border-b hairline last:border-0">
                    <td className="px-4 py-2.5">{i === 0 ? p.koreanName : ""}</td>
                    <td className="px-4 py-2.5">{v.size}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">{v.sku}</td>
                    <td className={`px-4 py-2.5 font-medium ${v.stock === 0 ? "text-accent" : ""}`}>
                      {v.stock === 0 ? "품절" : `${v.stock}개`}
                    </td>
                    <td className="px-4 py-2.5">
                      {v._count.restockRequests > 0 ? (
                        <span className="text-accent">{v._count.restockRequests}명 대기</span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5">
                        {[-1, 1, 10].map((delta) => (
                          <form key={delta} action={adjustStock}>
                            <input type="hidden" name="variantId" value={v.id} />
                            <input type="hidden" name="delta" value={delta} />
                            <button
                              type="submit"
                              className="border hairline px-2 py-1 text-xs transition-colors hover:border-ink"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
