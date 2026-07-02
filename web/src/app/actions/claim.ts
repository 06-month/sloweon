"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type ClaimState = { error?: string; ok?: boolean } | null;

const REASON_CODES = ["SIZE_SMALL", "SIZE_LARGE", "COLOR_DIFFERENT", "CHANGE_OF_MIND", "DEFECTIVE", "OTHER"];

/** 사이즈 교환/반품 요청 (O-009, O-010, S-008) */
export async function requestClaim(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const orderItemId = String(formData.get("orderItemId") ?? "");
  const requestType = String(formData.get("requestType") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const reasonDetail = String(formData.get("reasonDetail") ?? "").trim();
  const requestedVariantId = String(formData.get("requestedVariantId") ?? "") || null;

  if (!["EXCHANGE", "RETURN"].includes(requestType)) return { error: "요청 유형을 선택해주세요." };
  if (!REASON_CODES.includes(reasonCode)) return { error: "사유를 선택해주세요." };

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, claims: true },
  });
  if (!orderItem || orderItem.order.userId !== user.id) return { error: "요청할 수 없는 상품입니다." };
  if (orderItem.order.status !== "DELIVERED") return { error: "배송 완료된 주문만 교환/반품을 요청할 수 있습니다." };
  if (orderItem.claims.some((c) => c.status !== "REJECTED")) return { error: "이미 처리 중인 요청이 있습니다." };

  if (requestType === "EXCHANGE") {
    if (!requestedVariantId) return { error: "교환할 사이즈를 선택해주세요." };
    const target = await prisma.productVariant.findUnique({ where: { id: requestedVariantId } });
    if (!target || target.productId !== orderItem.productId) return { error: "교환 대상 옵션이 올바르지 않습니다." };
    if (target.stock < orderItem.quantity) return { error: "교환할 사이즈의 재고가 부족합니다. 재입고 알림을 신청해주세요." };
  }

  await prisma.exchangeReturnRequest.create({
    data: { orderItemId, requestType, reasonCode, reasonDetail: reasonDetail || null, requestedVariantId },
  });
  revalidatePath(`/mypage/orders/${orderItem.orderId}`);
  return { ok: true };
}
