import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export const metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="label-caps text-center">Login</p>
      <h1 className="display mt-1 text-center text-4xl">로그인</h1>
      {error && (
        <p className="mt-4 border hairline bg-surface px-4 py-3 text-center text-xs text-accent">{error}</p>
      )}
      <div className="mt-8 space-y-5">
        <LoginForm next={next} />
        <SocialLoginButtons next={next} />
      </div>
      <p className="mt-8 border hairline bg-surface p-3 text-center text-xs text-ink-faint">
        데모 계정 — member@sloweon.demo / member1234!
        <br />
        관리자 — admin@sloweon.demo / admin1234!
      </p>
    </div>
  );
}
