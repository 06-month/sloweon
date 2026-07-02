"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartItems, calcShippingFee } from "@/lib/cart";
import { getPointBalance } from "@/lib/points";
import { effectivePrice } from "@/lib/format";

export type OrderFormState = { error?: string } | null;

function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SW${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * 주문 생성 (O-003~O-007, M-001, M-003, BE-006, BE-008).
 * 서버 기준으로 쿠폰/포인트 포함 금액을 재계산하고,
 * 재고 검증→차감→쿠폰 사용→포인트 차감→주문/결제 생성을 단일 트랜잭션으로 처리한다.
 */
export async function placeOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const receiverName = String(formData.get("receiverName") ?? "").trim();
  const receiverPhone = String(formData.get("receiverPhone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const deliveryMemo = String(formData.get("deliveryMemo") ?? "").trim();
  const method = String(formData.get("method") ?? "CARD");
  const agreed = formData.get("agree") === "on";
  const userCouponId = String(formData.get("userCouponId") ?? "") || null;
  const usePoints = Math.max(0, Math.floor(Number(formData.get("usePoints") ?? 0) || 0));

  if (!receiverName) return { error: "받는 분 이름을 입력해주세요." };
  if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(receiverPhone)) return { error: "올바른 휴대폰 번호를 입력해주세요." };
  if (!zipCode || !address1) return { error: "배송지 주소를 입력해주세요." };
  if (!agreed) return { error: "주문 내용 확인 및 결제 진행에 동의해주세요." };

  const user = await getCurrentUser();
  const cartItems = await getCartItems();
  if (cartItems.length === 0) return { error: "장바구니가 비어 있습니다." };

  // 서버 기준 금액 계산 (O-005)
  const totalProductAmount = cartItems.reduce(
    (sum, item) => sum + effectivePrice(item.variant.product) * item.quantity,
    0,
  );

  // 쿠폰 검증 (회원 전용)
  let discountAmount = 0;
  if (userCouponId) {
    if (!user) return { error: "쿠폰은 로그인 후 사용할 수 있습니다." };
    const userCoupon = await prisma.userCoupon.findFirst({
      where: { id: userCouponId, userId: user.id, status: "ISSUED" },
      include: { coupon: true },
    });
    if (!userCoupon) return { error: "사용할 수 없는 쿠폰입니다." };
    const { coupon } = userCoupon;
    if (coupon.status !== "ACTIVE" || (coupon.endsAt && coupon.endsAt < new Date()))
      return { error: "기간이 지난 쿠폰입니다." };
    if (totalProductAmount < coupon.minOrderAmount)
      return { error: `이 쿠폰은 ${coupon.minOrderAmount.toLocaleString()}원 이상 주문에 사용할 수 있습니다.` };
    discountAmount =
      coupon.discountType === "RATE"
        ? Math.floor((totalProductAmount * coupon.discountValue) / 100)
        : Math.min(coupon.discountValue, totalProductAmount);
  }

  // 포인트 검증 (회원 전용)
  let pointUsedAmount = 0;
  if (usePoints > 0) {
    if (!user) return { error: "포인트는 로그인 후 사용할 수 있습니다." };
    const balance = await getPointBalance(user.id);
    if (usePoints > balance) return { error: `보유 포인트(${balance.toLocaleString()}P)를 초과했습니다.` };
    pointUsedAmount = Math.min(usePoints, totalProductAmount - discountAmount);
  }

  const shippingFee = calcShippingFee(totalProductAmount);
  const finalAmount = totalProductAmount - discountAmount - pointUsedAmount + shippingFee;

  let orderNumber: string;
  try {
    orderNumber = await prisma.$transaction(async (tx) => {
      // 결제 직전 재고 재검증 + 조건부 차감 (BE-008: 재고 0 미만 불가)
      for (const item of cartItems) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(
            `SOLD_OUT:${item.variant.product.koreanName} (${item.variant.size}) 재고가 부족합니다.`,
          );
        }
        const after = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeType: "ORDER",
            quantityDelta: -item.quantity,
            beforeQuantity: after.stock + item.quantity,
            afterQuantity: after.stock,
            referenceType: "ORDER",
          },
        });
        if (after.stock === 0) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { status: "SOLD_OUT" } });
        }
      }

      const number = newOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber: number,
          userId: user?.id ?? null,
          status: "PAID",
          totalProductAmount,
          discountAmount,
          pointUsedAmount,
          shippingFee,
          finalAmount,
          receiverName,
          receiverPhone,
          zipCode,
          address1,
          address2: address2 || null,
          deliveryMemo: deliveryMemo || null,
          items: {
            create: cartItems.map((item) => ({
              productId: item.variant.productId,
              variantId: item.variantId,
              productNameSnapshot: item.variant.product.koreanName,
              colorSnapshot: item.variant.colorName,
              sizeSnapshot: item.variant.size,
              quantity: item.quantity,
              unitPrice: effectivePrice(item.variant.product),
              totalPrice: effectivePrice(item.variant.product) * item.quantity,
            })),
          },
          payment: {
            create: {
              method,
              amount: finalAmount,
              status: "PAID",
              paymentKey: `mock_${randomBytes(12).toString("hex")}`,
              approvedAt: new Date(),
            },
          },
          statusHistories: {
            create: { previousStatus: null, nextStatus: "PAID", changedBy: user?.id ?? "GUEST" },
          },
        },
      });

      // 쿠폰 사용 처리 (동시 사용 방지: ISSUED 조건부 갱신)
      if (userCouponId && user) {
        const used = await tx.userCoupon.updateMany({
          where: { id: userCouponId, userId: user.id, status: "ISSUED" },
          data: { status: "USED", usedAt: new Date(), orderId: order.id },
        });
        if (used.count === 0) throw new Error("COUPON:이미 사용된 쿠폰입니다.");
      }

      // 포인트 차감 원장 (DB-006)
      if (pointUsedAmount > 0 && user) {
        const balance = await tx.pointLedger.aggregate({ where: { userId: user.id }, _sum: { amount: true } });
        const current = balance._sum.amount ?? 0;
        if (current < pointUsedAmount) throw new Error("POINT:포인트가 부족합니다.");
        await tx.pointLedger.create({
          data: {
            userId: user.id,
            changeType: "USE",
            amount: -pointUsedAmount,
            balanceAfter: current - pointUsedAmount,
            referenceType: "ORDER",
            referenceId: order.id,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { id: { in: cartItems.map((i) => i.id) } } });
      return order.orderNumber;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("SOLD_OUT:")) {
      revalidatePath("/cart");
      return { error: `${message.replace("SOLD_OUT:", "")} 장바구니를 확인해주세요.` };
    }
    if (message.startsWith("COUPON:") || message.startsWith("POINT:")) {
      return { error: message.split(":")[1] };
    }
    return { error: "주문 처리 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  revalidatePath("/", "layout");
  redirect(`/checkout/success?order=${orderNumber}`);
}

export type CancelState = { error?: string; ok?: boolean } | null;

/**
 * 고객 주문 취소 (O-008): 결제 완료(PAID) 상태에서만 가능.
 * 재고 복구 + 재고 원장 + 쿠폰 복원 + 포인트 환급 + 결제 취소를 단일 트랜잭션으로 처리.
 */
export async function cancelOrder(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true, usedCoupons: true },
  });
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.status !== "PAID") return { error: "배송 준비가 시작되어 취소할 수 없습니다. 고객센터로 문의해주세요." };

  await prisma.$transaction(async (tx) => {
    // 상태 경합 방지: PAID 조건부 갱신
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) throw new Error("이미 처리된 주문입니다.");

    for (const item of order.items) {
      const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: variant.stock + item.quantity, status: "ON_SALE" },
      });
      await tx.inventoryLedger.create({
        data: {
          variantId: item.variantId,
          changeType: "CANCEL",
          quantityDelta: item.quantity,
          beforeQuantity: variant.stock,
          afterQuantity: variant.stock + item.quantity,
          referenceType: "ORDER_CANCEL",
          referenceId: orderId,
        },
      });
      // 품절→재입고 전환 시 알림 대기 건 발송 처리
      if (variant.stock === 0) {
        await tx.restockRequest.updateMany({
          where: { variantId: item.variantId, status: "REQUESTED" },
          data: { status: "NOTIFIED", notifiedAt: new Date() },
        });
      }
    }

    await tx.orderStatusHistory.create({
      data: { orderId, previousStatus: "PAID", nextStatus: "CANCELLED", changedBy: user.id },
    });
    await tx.payment.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });

    // 쿠폰 복원
    for (const uc of order.usedCoupons) {
      await tx.userCoupon.update({
        where: { id: uc.id },
        data: { status: "ISSUED", usedAt: null, orderId: null },
      });
    }

    // 포인트 환급
    if (order.pointUsedAmount > 0) {
      const balance = await tx.pointLedger.aggregate({ where: { userId: user.id }, _sum: { amount: true } });
      const current = balance._sum.amount ?? 0;
      await tx.pointLedger.create({
        data: {
          userId: user.id,
          changeType: "REFUND",
          amount: order.pointUsedAmount,
          balanceAfter: current + order.pointUsedAmount,
          referenceType: "ORDER_CANCEL",
          referenceId: orderId,
        },
      });
    }
  });

  revalidatePath("/mypage");
  revalidatePath(`/mypage/orders/${orderId}`);
  return { ok: true };
}

export type PrepareOrderResult = {
  error?: string;
  orderNumber?: string;
  finalAmount?: number;
  productName?: string;
  customerName?: string;
  customerEmail?: string;
};

/**
 * PG사 결제창 진입을 위한 임시 가주문 생성 (O-003~O-006, BE-012)
 * 주문 정보 검증 후 가주문(PENDING) 상태로 주문을 선생성하여 반환합니다.
 */
export async function prepareOrder(formData: FormData): Promise<PrepareOrderResult> {
  const receiverName = String(formData.get("receiverName") ?? "").trim();
  const receiverPhone = String(formData.get("receiverPhone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const deliveryMemo = String(formData.get("deliveryMemo") ?? "").trim();
  const method = String(formData.get("method") ?? "CARD");
  const agreed = formData.get("agree") === "on";
  const userCouponId = String(formData.get("userCouponId") ?? "") || null;
  const usePoints = Math.max(0, Math.floor(Number(formData.get("usePoints") ?? 0) || 0));

  if (!receiverName) return { error: "받는 분 이름을 입력해주세요." };
  if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(receiverPhone)) return { error: "올바른 휴대폰 번호를 입력해주세요." };
  if (!zipCode || !address1) return { error: "배송지 주소를 입력해주세요." };
  if (!agreed) return { error: "주문 내용 확인 및 결제 진행에 동의해주세요." };

  const user = await getCurrentUser();
  const cartItems = await getCartItems();
  if (cartItems.length === 0) return { error: "장바구니가 비어 있습니다." };

  // 재고 사전 검증 (가주문 생성 전)
  for (const item of cartItems) {
    if (item.variant.stock < item.quantity) {
      return { error: `${item.variant.product.koreanName} (${item.variant.size}) 재고가 부족합니다.` };
    }
  }

  // 서버 기준 금액 계산 (O-005)
  const totalProductAmount = cartItems.reduce(
    (sum, item) => sum + effectivePrice(item.variant.product) * item.quantity,
    0,
  );

  // 쿠폰 검증
  let discountAmount = 0;
  if (userCouponId) {
    if (!user) return { error: "쿠폰은 로그인 후 사용할 수 있습니다." };
    const userCoupon = await prisma.userCoupon.findFirst({
      where: { id: userCouponId, userId: user.id, status: "ISSUED" },
      include: { coupon: true },
    });
    if (!userCoupon) return { error: "사용할 수 없는 쿠폰입니다." };
    const { coupon } = userCoupon;
    if (coupon.status !== "ACTIVE" || (coupon.endsAt && coupon.endsAt < new Date()))
      return { error: "기간이 지난 쿠폰입니다." };
    if (totalProductAmount < coupon.minOrderAmount)
      return { error: `이 쿠폰은 ${coupon.minOrderAmount.toLocaleString()}원 이상 주문에 사용할 수 있습니다.` };
    discountAmount =
      coupon.discountType === "RATE"
        ? Math.floor((totalProductAmount * coupon.discountValue) / 100)
        : Math.min(coupon.discountValue, totalProductAmount);
  }

  // 포인트 검증
  let pointUsedAmount = 0;
  if (usePoints > 0) {
    if (!user) return { error: "포인트는 로그인 후 사용할 수 있습니다." };
    const balance = await getPointBalance(user.id);
    if (usePoints > balance) return { error: `보유 포인트(${balance.toLocaleString()}P)를 초과했습니다.` };
    pointUsedAmount = Math.min(usePoints, totalProductAmount - discountAmount);
  }

  const shippingFee = calcShippingFee(totalProductAmount);
  const finalAmount = totalProductAmount - discountAmount - pointUsedAmount + shippingFee;

  const number = newOrderNumber();

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: number,
          userId: user?.id ?? null,
          status: "PENDING",
          totalProductAmount,
          discountAmount,
          pointUsedAmount,
          shippingFee,
          finalAmount,
          receiverName,
          receiverPhone,
          zipCode,
          address1,
          address2: address2 || null,
          deliveryMemo: deliveryMemo || null,
          items: {
            create: cartItems.map((item) => ({
              productId: item.variant.productId,
              variantId: item.variantId,
              productNameSnapshot: item.variant.product.koreanName,
              colorSnapshot: item.variant.colorName,
              sizeSnapshot: item.variant.size,
              quantity: item.quantity,
              unitPrice: effectivePrice(item.variant.product),
              totalPrice: effectivePrice(item.variant.product) * item.quantity,
            })),
          },
          payment: {
            create: {
              method,
              amount: finalAmount,
              status: "READY",
              provider: "TOSS_PAYMENTS",
              paymentKey: `ready_${number}_${randomBytes(4).toString("hex")}`,
            },
          },
          statusHistories: {
            create: { previousStatus: null, nextStatus: "PENDING", changedBy: user?.id ?? "GUEST" },
          },
        },
      });

      if (userCouponId && user) {
        await tx.userCoupon.update({
          where: { id: userCouponId },
          data: { orderId: order.id },
        });
      }
    });

    const firstItemName = cartItems[0].variant.product.koreanName;
    const productName = cartItems.length > 1 ? `${firstItemName} 외 ${cartItems.length - 1}건` : firstItemName;

    return {
      orderNumber: number,
      finalAmount,
      productName,
      customerName: receiverName,
      customerEmail: user?.email ?? "",
    };
  } catch (e) {
    console.error("prepareOrder error:", e);
    return { error: "가주문 생성 중 오류가 발생했습니다. 다시 시도해 주세요." };
  }
}
