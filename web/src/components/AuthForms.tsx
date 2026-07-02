"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthFormState } from "@/app/actions/auth";

const inputClass =
  "w-full border hairline bg-surface px-3 py-3 text-sm placeholder:text-ink-faint focus:border-line-strong focus:outline-none";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(login, null);
  return (
    <form action={formAction} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="email" name="email" required placeholder="이메일" autoComplete="email" className={inputClass} />
      <input type="password" name="password" required placeholder="비밀번호" autoComplete="current-password" className={inputClass} />
      {state?.error && <p className="text-xs text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
      <p className="pt-2 text-center text-xs text-ink-soft">
        아직 회원이 아니신가요?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="underline hover:text-ink">
          회원가입
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, null);
  return (
    <form action={formAction} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="email" name="email" required placeholder="이메일" autoComplete="email" className={inputClass} />
      <input
        type="password"
        name="password"
        required
        placeholder="비밀번호 (8자 이상, 영문·숫자·특수문자)"
        autoComplete="new-password"
        className={inputClass}
      />
      <input type="text" name="name" required placeholder="이름" autoComplete="name" className={inputClass} />
      <input type="tel" name="phone" placeholder="휴대폰 번호 (선택)" autoComplete="tel" className={inputClass} />
      <label className="flex items-start gap-2 pt-1 text-xs text-ink-soft">
        <input type="checkbox" name="agree" className="mt-0.5" />
        <span>이용약관 및 개인정보 처리방침에 동의합니다. (필수)</span>
      </label>
      {state?.error && <p className="text-xs text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "가입 중…" : "회원가입"}
      </button>
      <p className="pt-2 text-center text-xs text-ink-soft">
        이미 회원이신가요?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="underline hover:text-ink">
          로그인
        </Link>
      </p>
    </form>
  );
}
