export function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function discountRate(price: number, salePrice: number): number {
  return Math.round(((price - salePrice) / price) * 100);
}

export function effectivePrice(product: { price: number; salePrice: number | null }): number {
  return product.salePrice ?? product.price;
}

export const FIT_LABEL: Record<string, string> = {
  "relaxed fit": "릴랙스핏",
  "oversized fit": "오버사이즈핏",
  "oversized relaxed fit": "오버사이즈 릴랙스핏",
  "boxy fit": "박시핏",
  "loose fit": "루즈핏",
  "regular relaxed fit": "레귤러 릴랙스핏",
  "relaxed slim-straight": "릴랙스 슬림스트레이트",
  "relaxed tailoring": "릴랙스 테일러링",
  "wide straight fit": "와이드 스트레이트",
  "wide fit": "와이드핏",
  "wide tailored fit": "와이드 테일러드",
  "relaxed easy fit": "릴랙스 이지핏",
  "relaxed wide fit": "릴랙스 와이드핏",
  "relaxed straight fit": "릴랙스 스트레이트",
  "relaxed knee-length fit": "릴랙스 니렝스",
  "cropped wide fit": "크롭 와이드핏",
  "relaxed long shorts": "릴랙스 롱쇼츠",
  "relaxed shorts fit": "릴랙스 쇼츠핏",
  "relaxed tailored shorts": "릴랙스 테일러드 쇼츠",
};

export function fitLabel(fit: string): string {
  return FIT_LABEL[fit] ?? fit;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "주문 대기",
  PAID: "결제 완료",
  PREPARING: "배송 준비",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  CANCELLED: "취소 완료",
  REFUNDED: "환불 완료",
};

// 색상명 → placeholder 배경색 (이미지 미생성 시 폴백)
export const COLOR_HEX: Record<string, string> = {
  "sand beige": "#CBBBA0",
  "pale blue": "#B8C9D9",
  "pale blue stripe": "#C3D2DF",
  "off-white": "#F2EFE8",
  "washed navy": "#3F4A5C",
  navy: "#333E52",
  cream: "#EFE7D6",
  "faded black": "#3A3733",
  black: "#26241F",
  "light khaki": "#B4AD8F",
  "pale khaki": "#C2BCA0",
  charcoal: "#4C4A45",
  "stone grey": "#A8A398",
  "stone beige": "#BDB09A",
  ivory: "#EEE9DC",
  "light grey": "#C9C6BF",
  "olive grey": "#8B8A75",
};

export function colorHex(color: string): string {
  return COLOR_HEX[color] ?? "#D8D3C8";
}
