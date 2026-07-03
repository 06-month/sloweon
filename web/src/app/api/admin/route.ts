import { NextRequest } from "next/server";
import { handleAdminGet, handleAdminPost } from "@/lib/admin/adminApiHandlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdminGet(request);
}

export async function POST(request: NextRequest) {
  return handleAdminPost(request);
}
