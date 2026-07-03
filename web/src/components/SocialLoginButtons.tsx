/** 카카오/네이버 소셜 로그인 버튼 (C-011) — 브랜드 가이드 컬러 사용 */
export function SocialLoginButtons({ next }: { next?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] tracking-widest text-ink-faint">간편 로그인</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <a
        href={`/api/auth/kakao/start${query}`}
        className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-medium tracking-wide transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#FEE500", color: "#191919" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.65-.15.52-.97 3.36-1 3.58 0 0-.02.17.09.24.11.07.24.02.24.02.32-.05 3.66-2.4 4.24-2.8.57.08 1.16.13 1.77.13 5.52 0 10-3.54 10-7.9S17.52 3 12 3z" />
        </svg>
        카카오로 시작하기
      </a>
      <a
        href={`/api/auth/naver/start${query}`}
        className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-medium tracking-wide text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#03C75A" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.27 4v8.15L7.73 4H4v16h3.73v-8.15L16.27 20H20V4h-3.73z" />
        </svg>
        네이버로 시작하기
      </a>
    </div>
  );
}
