// 빌드 시 public/ 안의 데모 이미지 목록을 JSON으로 생성한다.
// Vercel 서버리스 함수에서는 public/ 파일에 fs로 접근할 수 없으므로,
// 존재 여부 판정은 이 매니페스트(번들에 포함)로 대체한다. (dev에서는 fs 실시간 확인)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function walk(dir, base) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

const productImages = walk(path.join(root, "public/menswear_demo_assets"), path.join(root, "public/menswear_demo_assets"));
const overviewImages = walk(path.join(root, "public/overview-image"), path.join(root, "public/overview-image")).map(
  (p) => `overview/${p}`,
);

const manifest = [...productImages, ...overviewImages].sort();
const outDir = path.join(root, "src/generated");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`asset-manifest.json 생성 완료 — 이미지 ${manifest.length}개`);
