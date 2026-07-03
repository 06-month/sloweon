import Image from "next/image";
import { assetExists, assetUrl } from "@/lib/assets";
import { colorHex } from "@/lib/format";

/**
 * 상품 이미지 — next/image로 최적화(WebP/AVIF 변환·뷰포트 크기 리사이즈).
 * 아직 생성되지 않은 이미지는 상품 색상 기반 placeholder로 표시한다.
 */
export function ProductImage({
  imagePath,
  alt,
  color,
  className = "",
  sizes = "(max-width: 768px) 50vw, 320px",
}: {
  imagePath: string;
  alt: string;
  color: string;
  className?: string;
  sizes?: string;
}) {
  if (assetExists(imagePath)) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={assetUrl(imagePath)}
          alt={alt}
          fill
          sizes={sizes}
          className={`object-cover ${className}`}
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`${alt} (이미지 준비 중)`}
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ backgroundColor: colorHex(color) }}
    >
      <span className="label-caps opacity-60">image coming soon</span>
    </div>
  );
}
