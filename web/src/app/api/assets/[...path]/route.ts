import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { resolveAsset } from "@/lib/assets";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const resolved = resolveAsset(segments.join("/"));
  if (!resolved) return new NextResponse("Forbidden", { status: 403 });

  const ext = path.extname(resolved).toLowerCase();
  const mime = MIME[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.promises.readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        // 이미지가 워커에 의해 추가/교체되는 중이므로 짧게 캐시
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
