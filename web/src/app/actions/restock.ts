"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type RestockState = { error?: string; ok?: boolean } | null;

/** 품절 옵션 재입고 알림 신청 (C-018, M-004). variant 단위, 중복 신청 방지. */
export async function requestRestock(_prev: RestockState, formData: FormData): Promise<RestockState> {
  const variantId = String(formData.get("variantId") ?? "");
  const guestEmail = String(formData.get("guestEmail") ?? "").trim();

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return { error: "옵션을 찾을 수 없습니다." };
  if (variant.stock > 0) return { error: "현재 구매 가능한 옵션입니다." };

  const user = await getCurrentUser();
  if (!user && !/.+@.+\..+/.test(guestEmail)) {
    return { error: "알림을 받을 이메일을 입력해주세요." };
  }

  const existing = await prisma.restockRequest.findFirst({
    where: {
      variantId,
      status: "REQUESTED",
      ...(user ? { userId: user.id } : { guestEmail }),
    },
  });
  if (existing) return { error: "이미 재입고 알림을 신청한 옵션입니다." };

  await prisma.restockRequest.create({
    data: { variantId, userId: user?.id ?? null, guestEmail: user ? null : guestEmail },
  });
  return { ok: true };
}
