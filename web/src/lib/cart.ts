import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { getCurrentUser } from "./auth";

const GUEST_COOKIE = "sw_guest";

export async function getGuestId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_COOKIE)?.value ?? null;
}

/** 쿠키가 없으면 새 게스트 id를 발급한다 (server action 안에서만 호출 가능). */
export async function ensureGuestId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const id = randomBytes(16).toString("hex");
  cookieStore.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return id;
}

export async function getCartItems() {
  const user = await getCurrentUser();
  const guestId = await getGuestId();
  if (!user && !guestId) return [];
  return prisma.cartItem.findMany({
    where: user ? { userId: user.id } : { guestSessionId: guestId },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** 선택 주문 (기획서 7.5): 체크된 항목만 주문서/결제 대상 */
export async function getSelectedCartItems() {
  const items = await getCartItems();
  return items.filter((item) => item.selected);
}

/** 로그인 직후 게스트 장바구니를 회원 장바구니로 병합한다 (C-014). */
export async function mergeGuestCartIntoUser(userId: string) {
  const guestId = await getGuestId();
  if (!guestId) return;
  const guestItems = await prisma.cartItem.findMany({ where: { guestSessionId: guestId } });
  for (const item of guestItems) {
    const existing = await prisma.cartItem.findUnique({
      where: { userId_variantId: { userId, variantId: item.variantId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { userId, guestSessionId: null },
      });
    }
  }
}

export const FREE_SHIPPING_THRESHOLD = 100000;
export const BASE_SHIPPING_FEE = 3000;

export function calcShippingFee(productAmount: number) {
  if (productAmount === 0) return 0;
  return productAmount >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
}
