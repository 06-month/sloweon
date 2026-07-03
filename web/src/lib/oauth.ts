import "server-only";

/**
 * 카카오/네이버 OAuth 설정 (C-011).
 * 표준 Authorization Code 흐름: start(state 발급·리다이렉트) → callback(code 교환·프로필 조회).
 */

export type OAuthProvider = "kakao" | "naver";

export type OAuthProfile = {
  providerUserId: string;
  email: string | null;
  name: string;
};

export const OAUTH_STATE_COOKIE = "sw_oauth_state";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function redirectUri(provider: OAuthProvider) {
  return `${appUrl()}/api/auth/${provider}/callback`;
}

export function isConfigured(provider: OAuthProvider): boolean {
  if (provider === "kakao") return !!process.env.KAKAO_REST_API_KEY;
  return !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET;
}

export function authorizeUrl(provider: OAuthProvider, state: string): string {
  if (provider === "kakao") {
    const params = new URLSearchParams({
      client_id: process.env.KAKAO_REST_API_KEY ?? "",
      redirect_uri: redirectUri("kakao"),
      response_type: "code",
      state,
    });
    return `https://kauth.kakao.com/oauth/authorize?${params}`;
  }
  const params = new URLSearchParams({
    client_id: process.env.NAVER_CLIENT_ID ?? "",
    redirect_uri: redirectUri("naver"),
    response_type: "code",
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params}`;
}

async function exchangeToken(provider: OAuthProvider, code: string, state: string): Promise<string> {
  const tokenUrl = provider === "kakao" ? "https://kauth.kakao.com/oauth/token" : "https://nid.naver.com/oauth2.0/token";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    state,
    redirect_uri: redirectUri(provider),
    client_id: provider === "kakao" ? process.env.KAKAO_REST_API_KEY ?? "" : process.env.NAVER_CLIENT_ID ?? "",
    client_secret: provider === "kakao" ? process.env.KAKAO_CLIENT_SECRET ?? "" : process.env.NAVER_CLIENT_SECRET ?? "",
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`${provider} 토큰 교환 실패: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.access_token as string;
}

async function fetchProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  if (provider === "kakao") {
    const res = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error(`카카오 프로필 조회 실패: ${JSON.stringify(data).slice(0, 200)}`);
    const account = data.kakao_account ?? {};
    return {
      providerUserId: String(data.id),
      // 이메일 동의 항목 미설정/미동의 시 null일 수 있음
      email: account.email ?? null,
      name: account.profile?.nickname ?? "카카오 회원",
    };
  }
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || data.resultcode !== "00") {
    throw new Error(`네이버 프로필 조회 실패: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return {
    providerUserId: String(data.response.id),
    email: data.response.email ?? null,
    name: data.response.name ?? data.response.nickname ?? "네이버 회원",
  };
}

export async function getOAuthProfile(provider: OAuthProvider, code: string, state: string): Promise<OAuthProfile> {
  const accessToken = await exchangeToken(provider, code, state);
  return fetchProfile(provider, accessToken);
}
