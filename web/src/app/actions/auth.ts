"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";

export type AuthFormState = { error?: string } | null;

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const agreed = formData.get("agree") === "on";
  const next = String(formData.get("next") ?? "/");

  if (!email || !/.+@.+\..+/.test(email)) return { error: "올바른 이메일을 입력해주세요." };
  if (!PASSWORD_RULE.test(password))
    return { error: "비밀번호는 8자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다." };
  if (!name) return { error: "이름을 입력해주세요." };
  if (!agreed) return { error: "이용약관과 개인정보 처리방침에 동의해주세요." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "이미 가입된 이메일입니다." };

  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), name, phone: phone || null },
  });

  // 첫 구매 쿠폰 자동 발급 (M-001) — 헤더 배너 안내와 동일
  const welcome = await prisma.coupon.findUnique({ where: { code: "WELCOME10" } });
  if (welcome && welcome.status === "ACTIVE") {
    await prisma.userCoupon.create({ data: { userId: user.id, couponId: welcome.id } });
  }

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  redirect(next);
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "이메일 또는 비밀번호가 일치하지 않습니다." };
  if (!user.passwordHash) {
    return { error: "소셜 로그인으로 가입된 계정입니다. 카카오 또는 네이버로 로그인해주세요." };
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "이메일 또는 비밀번호가 일치하지 않습니다." };
  }
  if (user.status !== "ACTIVE") return { error: "사용할 수 없는 계정입니다." };

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });
  redirect(user.role === "ADMIN" ? "/admin" : next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}
