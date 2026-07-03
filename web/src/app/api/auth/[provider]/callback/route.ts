import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { getOAuthProfile, OAUTH_STATE_COOKIE, type OAuthProvider } from "@/lib/oauth";

function loginError(req: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url));
}

/**
 * 소셜 로그인 콜백 (C-011):
 * state 검증 → 토큰 교환 → 프로필 조회 → 계정 연결/생성 → 세션 발급 + 게스트 카트 병합.
 * 같은 이메일의 기존 계정이 있으면 소셜 계정을 연결하고, 신규면 회원 생성 + 웰컴 쿠폰 발급.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params;
  if (rawProvider !== "kakao" && rawProvider !== "naver") {
    return loginError(req, "지원하지 않는 로그인 방식입니다.");
  }
  const provider = rawProvider as OAuthProvider;
  const providerLabel = provider === "kakao" ? "카카오" : "네이버";

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const stateCookieRaw = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code) {
    // 사용자가 동의 화면에서 취소한 경우 등
    return loginError(req, `${providerLabel} 로그인이 취소되었습니다.`);
  }

  let next = "/";
  try {
    const saved = stateCookieRaw ? (JSON.parse(stateCookieRaw) as { state: string; next: string }) : null;
    if (!saved || saved.state !== state) {
      return loginError(req, "로그인 요청이 만료되었습니다. 다시 시도해주세요.");
    }
    next = saved.next || "/";
  } catch {
    return loginError(req, "로그인 요청이 올바르지 않습니다. 다시 시도해주세요.");
  }

  try {
    const profile = await getOAuthProfile(provider, code, state);
    const providerCode = provider.toUpperCase(); // KAKAO | NAVER

    // 1) 이미 연결된 소셜 계정 → 해당 회원으로 로그인
    let account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider: providerCode, providerUserId: profile.providerUserId },
      },
      include: { user: true },
    });

    let userId: string;
    if (account) {
      if (account.user.status !== "ACTIVE") return loginError(req, "사용할 수 없는 계정입니다.");
      userId = account.userId;
    } else {
      // 2) 같은 이메일의 기존 회원이 있으면 소셜 계정 연결, 없으면 신규 생성
      // 카카오는 이메일 미제공 가능 → provider 고유 placeholder 이메일 사용
      const email =
        profile.email?.toLowerCase() ?? `${provider}_${profile.providerUserId}@social.sloweon.local`;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.status !== "ACTIVE") return loginError(req, "사용할 수 없는 계정입니다.");
        userId = existing.id;
      } else {
        const created = await prisma.user.create({
          data: { email, name: profile.name, passwordHash: null },
        });
        // 신규 회원 웰컴 쿠폰 (M-001) — 일반 가입과 동일 혜택
        const welcome = await prisma.coupon.findUnique({ where: { code: "WELCOME10" } });
        if (welcome && welcome.status === "ACTIVE") {
          await prisma.userCoupon.create({ data: { userId: created.id, couponId: welcome.id } });
        }
        userId = created.id;
      }

      account = await prisma.oAuthAccount.create({
        data: { userId, provider: providerCode, providerUserId: profile.providerUserId, email: profile.email },
        include: { user: true },
      });
    }

    await createSession(userId);
    await mergeGuestCartIntoUser(userId);

    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (e) {
    console.error(`${provider} OAuth callback error:`, e);
    return loginError(req, `${providerLabel} 로그인 중 오류가 발생했습니다. 다시 시도해주세요.`);
  }
}
