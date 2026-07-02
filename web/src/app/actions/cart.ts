"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureGuestId } from "@/lib/cart";

export type CartActionState = { error?: string; ok?: boolean } | null;

async function ownerWhere() {
  const user = await getCurrentUser();
  if (user) return { userId: user.id, guestSessionId: null as string | null };
  const guestId = await ensureGuestId();
  return { userId: null as string | null, guestSessionId: guestId };
}

async function upsertCartItem(variantId: string, quantity: number): Promise<string | null> {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return "옵션을 찾을 수 없습니다.";
  if (variant.stock <= 0) return "품절된 옵션입니다. 재입고 알림을 신청해주세요.";

  const owner = await ownerWhere();
  const existing = await prisma.cartItem.findFirst({
    where: owner.userId ? { userId: owner.userId, variantId } : { guestSessionId: owner.guestSessionId, variantId },
  });
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > variant.stock) return `재고가 부족합니다. (남은 수량 ${variant.stock}개)`;

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await prisma.cartItem.create({
      data: { userId: owner.userId, guestSessionId: owner.guestSessionId, variantId, quantity },
    });
  }
  return null;
}

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  if (!variantId) return { error: "색상과 사이즈를 선택해주세요." };

  const error = await upsertCartItem(variantId, quantity);
  if (error) return { error };
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 룩북 코디 세트 담기 (O-002): 모든 상품의 옵션이 선택돼야 하며 품절 옵션은 담지 않는다. */
export async function addOutfitToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantIds = formData.getAll("variantId").map(String).filter(Boolean);
  const expected = Number(formData.get("expectedCount") ?? 0);
  if (variantIds.length < expected) return { error: "모든 상품의 사이즈를 선택해주세요." };

  for (const variantId of variantIds) {
    const error = await upsertCartItem(variantId, 1);
    if (error) {
      const v = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      return { error: `${v?.product.koreanName ?? "상품"}: ${error}` };
    }
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCartQuantity(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const owner = await ownerWhere();
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { variant: true } });
  if (!item) return;
  const isOwner = owner.userId ? item.userId === owner.userId : item.guestSessionId === owner.guestSessionId;
  if (!isOwner) return;
  const nextQty = item.quantity + delta;
  if (nextQty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else if (nextQty <= item.variant.stock) {
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: nextQty } });
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const owner = await ownerWhere();
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const isOwner = owner.userId ? item.userId === owner.userId : item.guestSessionId === owner.guestSessionId;
  if (!isOwner) return;
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
