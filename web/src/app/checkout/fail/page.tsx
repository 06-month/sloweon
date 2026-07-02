import Link from "next/link";

export const metadata = { title: "결제 실패" };

interface FailPageProps {
  searchParams: Promise<{
    code?: string;
    message?: string;
  }>;
}

export default async function CheckoutFailPage({ searchParams }: FailPageProps) {
  const { code, message } = await searchParams;
  const errorCode = code || "UNKNOWN_ERROR";
  const errorMessage = message || "결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.";

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mb-6 flex justify-center">
        {/* Muted Warning Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
            />
          </svg>
        </div>
      </div>

      <p className="label-caps text-accent font-medium">Payment Failed</p>
      <h1 className="display mt-2 text-3xl font-semibold tracking-tight text-ink">결제에 실패했습니다</h1>
      
      <div className="mt-8 border hairline bg-surface p-6 text-left">
        <p className="text-xs text-ink-faint uppercase tracking-wider font-semibold">오류 코드</p>
        <p className="mt-1 text-sm font-mono text-ink font-medium">{errorCode}</p>
        
        <p className="mt-5 text-xs text-ink-faint uppercase tracking-wider font-semibold">상세 메시지</p>
        <p className="mt-1 text-sm text-ink-soft leading-relaxed break-words">{errorMessage}</p>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Link
          href="/checkout"
          className="w-full bg-ink py-4 text-xs font-medium tracking-[0.2em] text-bg transition-opacity hover:opacity-85"
        >
          다시 결제하기
        </Link>
        <Link
          href="/cart"
          className="w-full border hairline py-4 text-xs font-medium tracking-[0.2em] text-ink-soft hover:border-ink hover:text-ink transition-colors"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    </div>
  );
}
