import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeUrl, isConfigured, OAUTH_STATE_COOKIE, type OAuthProvider } from "@/lib/oauth";

/** 소셜 로그인 시작: CSRF 방지용 state 발급 후 제공사 인증 페이지로 리다이렉트 (C-011) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (provider !== "kakao" && provider !== "naver") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!isConfigured(provider as OAuthProvider)) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`${provider === "kakao" ? "카카오" : "네이버"} 로그인이 아직 설정되지 않았습니다.`)}`, req.url),
    );
  }

  const state = randomBytes(16).toString("hex");
  // 로그인 후 돌아갈 위치를 state 쿠키에 함께 저장
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  const res = NextResponse.redirect(authorizeUrl(provider as OAuthProvider, state));
  res.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
