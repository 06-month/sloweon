import { assetExists, assetUrl } from "@/lib/assets";
import { colorHex } from "@/lib/format";

/**
 * 상품 이미지. 아직 생성되지 않은 이미지는 상품 색상 기반 placeholder로 표시한다.
 * 이미지 파일이 menswear_demo_assets에 추가되면 다음 요청부터 자동 노출된다.
 */
export function ProductImage({
  imagePath,
  alt,
  color,
  className = "",
  sizes,
}: {
  imagePath: string;
  alt: string;
  color: string;
  className?: string;
  sizes?: string;
}) {
  if (assetExists(imagePath)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assetUrl(imagePath)}
        alt={alt}
        loading="lazy"
        sizes={sizes}
        className={`h-full w-full object-cover ${className}`}
      />
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
