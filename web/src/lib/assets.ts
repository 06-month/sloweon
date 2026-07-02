import fs from "node:fs";
import path from "node:path";

/**
 * 데모 이미지 자산 루트.
 * - 상품 이미지: menswear_demo_assets/ (이미지 생성 작업 진행 중 — 파일 추가 시 즉시 반영)
 * - 메인 페이지 비주얼: overview-image/ (경로 앞에 "overview/" 프리픽스로 접근)
 * 파일을 복사하지 않고 원본 디렉토리를 직접 서빙한다.
 */
export const ASSETS_ROOT = path.resolve(process.cwd(), "public/menswear_demo_assets");
export const OVERVIEW_ROOT = path.resolve(process.cwd(), "public/overview-image");

const OVERVIEW_PREFIX = "overview/";

/** 상대 경로를 실제 파일 경로로 해석. 루트 밖 접근은 null. */
export function resolveAsset(relativePath: string): string | null {
  const isOverview = relativePath.startsWith(OVERVIEW_PREFIX);
  const root = isOverview ? OVERVIEW_ROOT : ASSETS_ROOT;
  const rel = isOverview ? relativePath.slice(OVERVIEW_PREFIX.length) : relativePath;
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

/** manifest 상대 경로 → 서빙 URL */
export function assetUrl(relativePath: string): string {
  return `/api/assets/${relativePath}`;
}

/** 서버 컴포넌트에서 이미지 존재 여부를 미리 확인해 폴백을 결정한다. */
export function assetExists(relativePath: string): boolean {
  const resolved = resolveAsset(relativePath);
  if (!resolved) return false;
  try {
    return fs.statSync(resolved).isFile();
  } catch {
    return false;
  }
}

// 메인 페이지 비주얼 슬롯 — overview-image/ 디렉토리의 파일과 1:1 매칭
export const HERO_IMAGE_PATH = "overview/overview_01.png";
export const NEW_ARRIVAL_IMAGE_PATH = "overview/new_arrival.png";
export const TOPS_IMAGE_PATH = "overview/top_image.png";
export const BOTTOMS_IMAGE_PATH = "overview/pants_image.png";
export const SETUP_IMAGE_PATH = "overview/setup-collection.png";
