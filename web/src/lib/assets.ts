import fs from "node:fs";
import path from "node:path";
import assetManifest from "@/generated/asset-manifest.json";

/**
 * 데모 이미지 자산 — web/public/ 아래에 있으므로 Vercel CDN 정적 URL로 직접 서빙한다.
 * - 상품 이미지: public/menswear_demo_assets/ → /menswear_demo_assets/...
 * - 메인 비주얼: public/overview-image/ → /overview-image/... (경로 프리픽스 "overview/")
 *
 * 존재 여부 판정:
 * - production(Vercel): 서버리스 함수에서 public/에 fs 접근 불가 → 빌드 시 생성된 매니페스트 사용
 * - development: 이미지 생성 워커가 파일을 추가하는 즉시 반영되도록 fs로 실시간 확인
 */
const OVERVIEW_PREFIX = "overview/";
const manifestSet = new Set<string>(assetManifest as string[]);

export const ASSETS_ROOT = path.resolve(process.cwd(), "public/menswear_demo_assets");
export const OVERVIEW_ROOT = path.resolve(process.cwd(), "public/overview-image");

/** manifest 상대 경로 → 정적 서빙 URL */
export function assetUrl(relativePath: string): string {
  if (relativePath.startsWith(OVERVIEW_PREFIX)) {
    return `/overview-image/${relativePath.slice(OVERVIEW_PREFIX.length)}`;
  }
  return `/menswear_demo_assets/${relativePath}`;
}

export function assetExists(relativePath: string): boolean {
  if (process.env.NODE_ENV !== "development") {
    return manifestSet.has(relativePath);
  }
  const isOverview = relativePath.startsWith(OVERVIEW_PREFIX);
  const root = isOverview ? OVERVIEW_ROOT : ASSETS_ROOT;
  const rel = isOverview ? relativePath.slice(OVERVIEW_PREFIX.length) : relativePath;
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) return false;
  try {
    return fs.statSync(resolved).isFile();
  } catch {
    return false;
  }
}

// 메인 페이지 비주얼 슬롯 — public/overview-image/ 파일과 1:1 매칭
export const HERO_IMAGE_PATH = "overview/overview_01.png";
export const NEW_ARRIVAL_IMAGE_PATH = "overview/new_arrival.png";
export const TOPS_IMAGE_PATH = "overview/top_image.png";
export const BOTTOMS_IMAGE_PATH = "overview/pants_image.png";
export const SETUP_IMAGE_PATH = "overview/setup-collection.png";
