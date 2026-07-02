"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type ReviewState = { error?: string; ok?: boolean } | null;

const FIT_FEEDBACK = ["SMALL", "JUST", "LARGE"];

/** 착용 리뷰 작성 (R-001, R-002): 구매자만, 배송 완료 주문 상품에 1건 */
export async function createReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const orderItemId = String(formData.get("orderItemId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const content = String(formData.get("content") ?? "").trim();
  const fitFeedback = String(formData.get("fitFeedback") ?? "");
  const height = Number(formData.get("height") ?? 0) || null;
  const weight = Number(formData.get("weight") ?? 0) || null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "별점을 선택해주세요." };
  if (content.length < 5) return { error: "리뷰 내용을 5자 이상 입력해주세요." };
  if (!FIT_FEEDBACK.includes(fitFeedback)) return { error: "핏 평가를 선택해주세요." };

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, review: true },
  });
  if (!orderItem || orderItem.order.userId !== user.id) return { error: "리뷰를 작성할 수 없는 상품입니다." };
  if (orderItem.order.status !== "DELIVERED") return { error: "배송 완료 후 리뷰를 작성할 수 있습니다." };
  if (orderItem.review) return { error: "이미 리뷰를 작성한 상품입니다." };

  await prisma.review.create({
    data: {
      userId: user.id,
      productId: orderItem.productId,
      orderItemId,
      rating,
      content,
      fitFeedback,
      height,
      weight,
      purchasedSize: orderItem.sizeSnapshot,
    },
  });
  revalidatePath(`/products/${orderItem.productId}`);
  revalidatePath(`/mypage/orders/${orderItem.orderId}`);
  return { ok: true };
}
