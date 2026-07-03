import { NextResponse } from "next/server";
import { getTraces } from "@/lib/agents/trace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 보안 정책 가드: 개발 환경(development)이거나 ADMIN_TRACE_VIEWER_ENABLED=true 환경변수가 켜져 있을 때만 허용
    const isDev = process.env.NODE_ENV === "development";
    const isEnabled = process.env.ADMIN_TRACE_VIEWER_ENABLED === "true";

    if (!isDev && !isEnabled) {
      return NextResponse.json(
        { error: "Access Denied: Trace viewer is disabled on production by default. Enable it via ADMIN_TRACE_VIEWER_ENABLED=true." },
        { status: 403 }
      );
    }

    const traces = getTraces();
    return NextResponse.json({ traces });
  } catch (error: any) {
    return NextResponse.json({ error: "Trace 조회 실패" }, { status: 500 });
  }
}
