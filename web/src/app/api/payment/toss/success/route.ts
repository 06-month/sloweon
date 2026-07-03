import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/format";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amountStr = searchParams.get("amount");

  if (!paymentKey || !orderId || !amountStr) {
    return NextResponse.redirect(
      new URL(`/checkout/fail?code=INVALID_PARAMS&message=${encodeURIComponent("필수 결제 파라미터가 누락되었습니다.")}`, req.url)
    );
  }

  const amount = Number(amountStr);

  // 1. 가주문 데이터 조회
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderId },
    include: { items: { include: { variant: { include: { product: true } } } }, usedCoupons: true },
  });

  if (!order) {
    return NextResponse.redirect(
      new URL(`/checkout/fail?code=ORDER_NOT_FOUND&message=${encodeURIComponent("주문 정보를 찾을 수 없습니다.")}`, req.url)
    );
  }

  if (order.status !== "PENDING") {
    if (order.status === "PAID") {
      return NextResponse.redirect(new URL(`/checkout/success?order=${order.orderNumber}`, req.url));
    }
    return NextResponse.redirect(
      new URL(`/checkout/fail?code=INVALID_ORDER_STATUS&message=${encodeURIComponent("처리할 수 없는 주문 상태입니다.")}`, req.url)
    );
  }

  if (order.finalAmount !== amount) {
    return NextResponse.redirect(
      new URL(`/checkout/fail?code=AMOUNT_MISMATCH&message=${encodeURIComponent("결제 금액이 일치하지 않습니다.")}`, req.url)
    );
  }

  // 2. 토스페이먼츠 승인 API 호출 준비 (키는 .env의 TOSS_SECRET_KEY)
  const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R";
  const basicAuth = Buffer.from(secretKey + ":").toString("base64");

  try {
    // 3.1 토스페이먼츠 승인 요청 실행
    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const confirmData = await confirmRes.json();
    if (!confirmRes.ok) {
      console.error("Toss Payments confirm failed:", confirmData);
      return NextResponse.redirect(
        new URL(
          `/checkout/fail?code=${confirmData.code}&message=${encodeURIComponent(confirmData.message || "결제 승인 중 오류가 발생했습니다.")}`,
          req.url
        )
      );
    }

    // 3.2 토스페이먼츠 승인 성공 후 데이터베이스 반영 (재고 검증, 차감, 쿠폰/포인트 사용 처리)
    await prisma.$transaction(async (tx) => {
      // 결제 완료 직전 재고 재검증 및 차감 (BE-008, O-003)
      for (const item of order.items) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count === 0) {
          throw new Error(`SOLD_OUT:${item.productNameSnapshot} (${item.sizeSnapshot}) 재고가 부족합니다.`);
        }

        const after = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        
        // 재고 변동 내역 생성 (DB-006)
        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeType: "ORDER",
            quantityDelta: -item.quantity,
            beforeQuantity: after.stock + item.quantity,
            afterQuantity: after.stock,
            referenceType: "ORDER",
            referenceId: order.id,
          },
        });

        if (after.stock === 0) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { status: "SOLD_OUT" },
          });
        }
      }

      // 주문 상태를 PAID로 전환 및 상태 이력 생성 (O-008)
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: "PENDING",
          nextStatus: "PAID",
          changedBy: order.userId ?? "GUEST",
        },
      });

      // 결제 기록 업데이트 (Payment)
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: "PAID",
          paymentKey,
          approvedAt: new Date(confirmData.approvedAt || new Date()),
        },
      });

      // 쿠폰 정식 사용 처리
      if (order.usedCoupons.length > 0) {
        for (const uc of order.usedCoupons) {
          const used = await tx.userCoupon.updateMany({
            where: { id: uc.id, status: "ISSUED" },
            data: { status: "USED", usedAt: new Date() },
          });
          if (used.count === 0) throw new Error("COUPON:이미 사용된 쿠폰입니다.");
        }
      }

      // 포인트 사용 원장 기록 및 차감 (DB-006, M-003)
      if (order.pointUsedAmount > 0 && order.userId) {
        const balance = await tx.pointLedger.aggregate({ where: { userId: order.userId }, _sum: { amount: true } });
        const current = balance._sum.amount ?? 0;
        if (current < order.pointUsedAmount) throw new Error("POINT:포인트가 부족합니다.");
        await tx.pointLedger.create({
          data: {
            userId: order.userId,
            changeType: "USE",
            amount: -order.pointUsedAmount,
            balanceAfter: current - order.pointUsedAmount,
            referenceType: "ORDER",
            referenceId: order.id,
          },
        });
      }

      // 장바구니 비우기 — 선택 주문이므로 이번 주문에 포함된 옵션만 제거 (미선택 항목 보존)
      const orderedVariantIds = order.items.map((item) => item.variantId);
      if (order.userId) {
        await tx.cartItem.deleteMany({
          where: { userId: order.userId, variantId: { in: orderedVariantIds } },
        });
      } else {
        const guestSessionId = req.cookies.get("sw_guest")?.value;
        if (guestSessionId) {
          await tx.cartItem.deleteMany({
            where: { guestSessionId, variantId: { in: orderedVariantIds } },
          });
        }
      }
    });

  } catch (e: any) {
    console.error("Payment confirmation database error:", e);
    const message = e instanceof Error ? e.message : "";
    let userMsg = "주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";
    if (message.startsWith("SOLD_OUT:")) {
      userMsg = message.replace("SOLD_OUT:", "");
    } else if (message.startsWith("COUPON:") || message.startsWith("POINT:")) {
      userMsg = message.split(":")[1];
    }

    // 데이터베이스 반영 에러 시 토스페이먼츠 결제 즉시 자동 취소 (환불) 호출 (결제 무결성 보장)
    try {
      const cancelRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: `DB 반영 실패 자동 취소: ${userMsg}`,
        }),
      });
      const cancelData = await cancelRes.json();
      if (!cancelRes.ok) {
        console.error("Toss Payments automatically cancel failed:", cancelData);
      }
    } catch (cancelErr) {
      console.error("Toss Payments automatically cancel network error:", cancelErr);
    }

    // 가주문 및 결제 정보 실패 처리
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        await tx.payment.update({ where: { orderId: order.id }, data: { status: "FAILED" } });
        // 쿠폰 롤백 (가주문에 할당된 orderId 링크 해제)
        if (order.usedCoupons.length > 0) {
          for (const uc of order.usedCoupons) {
            await tx.userCoupon.update({ where: { id: uc.id }, data: { orderId: null } });
          }
        }
      });
    } catch (dbErr) {
      console.error("Failed to mark order as cancelled in DB after confirm fail:", dbErr);
    }

    return NextResponse.redirect(
      new URL(`/checkout/fail?code=DB_CONFIRM_FAIL&message=${encodeURIComponent(userMsg)}`, req.url)
    );
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL(`/checkout/success?order=${order.orderNumber}`, req.url));
}
