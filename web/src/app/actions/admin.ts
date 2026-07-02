"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { POINT_EARN_RATE } from "@/lib/points";

const ORDER_FLOW = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];

export async function updateOrderStatus(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  if (!ORDER_FLOW.includes(nextStatus) && nextStatus !== "CANCELLED") return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await tx.orderStatusHistory.create({
      data: { orderId, previousStatus: order.status, nextStatus, changedBy: admin.id },
    });

    // 배송 완료 시 포인트 적립 (M-003) — 중복 적립 방지
    if (nextStatus === "DELIVERED" && order.userId) {
      const alreadyEarned = await tx.pointLedger.findFirst({
        where: { referenceType: "ORDER_EARN", referenceId: orderId },
      });
      if (!alreadyEarned) {
        const earn = Math.floor(order.finalAmount * POINT_EARN_RATE);
        if (earn > 0) {
          const balance = await tx.pointLedger.aggregate({
            where: { userId: order.userId },
            _sum: { amount: true },
          });
          await tx.pointLedger.create({
            data: {
              userId: order.userId,
              changeType: "EARN",
              amount: earn,
              balanceAfter: (balance._sum.amount ?? 0) + earn,
              referenceType: "ORDER_EARN",
              referenceId: orderId,
            },
          });
        }
      }
    }
  });
  revalidatePath("/admin/orders");
  revalidatePath("/mypage");
}

/** 재고 조정 (A-003, S-012). 재고 원장 기록 + 재입고 시 알림 신청 상태 갱신. */
export async function adjustStock(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const variantId = String(formData.get("variantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  if (!variantId || !Number.isInteger(delta) || delta === 0) return;

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return;
    const after = Math.max(0, variant.stock + delta);
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: after, status: after > 0 ? "ON_SALE" : "SOLD_OUT" },
    });
    await tx.inventoryLedger.create({
      data: {
        variantId,
        changeType: "ADMIN_ADJUST",
        quantityDelta: after - variant.stock,
        beforeQuantity: variant.stock,
        afterQuantity: after,
        createdBy: admin.id,
      },
    });
    if (variant.stock === 0 && after > 0) {
      await tx.restockRequest.updateMany({
        where: { variantId, status: "REQUESTED" },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });
    }
  });
  revalidatePath("/admin/stock");
}

/**
 * 교환/반품 요청 처리 (A-010).
 * 승인 → 완료 시: 반품은 재고 복구, 교환은 기존 옵션 복구 + 새 옵션 조건부 차감.
 */
export async function processClaim(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const claimId = String(formData.get("claimId") ?? "");
  const action = String(formData.get("action") ?? ""); // APPROVE | REJECT | COMPLETE

  const claim = await prisma.exchangeReturnRequest.findUnique({
    where: { id: claimId },
    include: { orderItem: true },
  });
  if (!claim) return;

  if (action === "APPROVE" && claim.status === "REQUESTED") {
    await prisma.exchangeReturnRequest.update({ where: { id: claimId }, data: { status: "APPROVED" } });
  } else if (action === "REJECT" && claim.status === "REQUESTED") {
    await prisma.exchangeReturnRequest.update({
      where: { id: claimId },
      data: { status: "REJECTED", rejectedReason: "관리자 확인 후 거절 처리" },
    });
  } else if (action === "COMPLETE" && claim.status === "APPROVED") {
    await prisma.$transaction(async (tx) => {
      const { orderItem } = claim;

      if (claim.requestType === "EXCHANGE" && claim.requestedVariantId) {
        // 새 사이즈 조건부 차감 (재고 부족 시 완료 불가)
        const taken = await tx.productVariant.updateMany({
          where: { id: claim.requestedVariantId, stock: { gte: orderItem.quantity } },
          data: { stock: { decrement: orderItem.quantity } },
        });
        if (taken.count === 0) throw new Error("교환 대상 재고 부족");
        const newVariant = await tx.productVariant.findUniqueOrThrow({ where: { id: claim.requestedVariantId } });
        await tx.inventoryLedger.create({
          data: {
            variantId: claim.requestedVariantId,
            changeType: "EXCHANGE_OUT",
            quantityDelta: -orderItem.quantity,
            beforeQuantity: newVariant.stock + orderItem.quantity,
            afterQuantity: newVariant.stock,
            referenceType: "CLAIM",
            referenceId: claimId,
            createdBy: admin.id,
          },
        });
        if (newVariant.stock === 0) {
          await tx.productVariant.update({ where: { id: claim.requestedVariantId }, data: { status: "SOLD_OUT" } });
        }
      }

      // 기존 옵션 재고 복구 (반품·교환 공통: 회수 상품 입고)
      const oldVariant = await tx.productVariant.findUniqueOrThrow({ where: { id: orderItem.variantId } });
      await tx.productVariant.update({
        where: { id: orderItem.variantId },
        data: { stock: oldVariant.stock + orderItem.quantity, status: "ON_SALE" },
      });
      await tx.inventoryLedger.create({
        data: {
          variantId: orderItem.variantId,
          changeType: claim.requestType === "RETURN" ? "RETURN_IN" : "EXCHANGE_IN",
          quantityDelta: orderItem.quantity,
          beforeQuantity: oldVariant.stock,
          afterQuantity: oldVariant.stock + orderItem.quantity,
          referenceType: "CLAIM",
          referenceId: claimId,
          createdBy: admin.id,
        },
      });

      await tx.exchangeReturnRequest.update({ where: { id: claimId }, data: { status: "COMPLETED" } });
    });
  }
  revalidatePath("/admin/returns");
}
