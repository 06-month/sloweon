import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/AuthForms";

export const metadata = { title: "회원가입" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="label-caps text-center">Join</p>
      <h1 className="display mt-1 text-center text-4xl">회원가입</h1>
      <p className="mt-3 text-center text-xs text-ink-soft">가입 즉시 첫 구매 10% 쿠폰을 드립니다.</p>
      <div className="mt-8">
        <SignupForm next={next} />
      </div>
    </div>
  );
}
