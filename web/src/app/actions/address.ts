"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type AddressState = { error?: string; ok?: boolean } | null;

export async function createAddress(_prev: AddressState, formData: FormData): Promise<AddressState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const receiverName = String(formData.get("receiverName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const deliveryMemo = String(formData.get("deliveryMemo") ?? "").trim();
  const isDefault = formData.get("isDefault") === "on";

  if (!receiverName || !zipCode || !address1) return { error: "받는 분, 우편번호, 주소는 필수입니다." };
  if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone)) return { error: "올바른 휴대폰 번호를 입력해주세요." };

  const count = await prisma.address.count({ where: { userId: user.id } });
  await prisma.$transaction(async (tx) => {
    if (isDefault || count === 0) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    await tx.address.create({
      data: {
        userId: user.id,
        receiverName,
        phone,
        zipCode,
        address1,
        address2: address2 || null,
        deliveryMemo: deliveryMemo || null,
        isDefault: isDefault || count === 0,
      },
    });
  });
  revalidatePath("/mypage/addresses");
  return { ok: true };
}

export async function deleteAddress(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("addressId") ?? "");
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/mypage/addresses");
}

export async function setDefaultAddress(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("addressId") ?? "");
  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) return;
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/mypage/addresses");
}
