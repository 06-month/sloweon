import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "PAYMENT_FAILED";
  const message = searchParams.get("message") || "결제를 완료하지 못했습니다.";
  const orderId = searchParams.get("orderId");

  console.warn(`Toss Payments failed. OrderId: ${orderId}, Code: ${code}, Message: ${message}`);

  if (orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber: orderId },
        include: { usedCoupons: true },
      });

      if (order && order.status === "PENDING") {
        await prisma.$transaction(async (tx) => {
          // 가주문 상태를 CANCELLED로 변경
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              previousStatus: "PENDING",
              nextStatus: "CANCELLED",
              changedBy: order.userId ?? "GUEST",
            },
          });

          // 결제 기록 상태를 FAILED로 변경
          await tx.payment.update({
            where: { orderId: order.id },
            data: { status: "FAILED" },
          });

          // 사용 대기 중이던 쿠폰 원복 (orderId 해제)
          if (order.usedCoupons.length > 0) {
            for (const uc of order.usedCoupons) {
              await tx.userCoupon.update({
                where: { id: uc.id },
                data: { orderId: null },
              });
            }
          }
        });
      }
    } catch (e) {
      console.error("Failed to update failed order status in database:", e);
    }
  }

  return NextResponse.redirect(
    new URL(`/checkout/fail?code=${code}&message=${encodeURIComponent(message)}`, req.url)
  );
}
