/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return "\u20A9" + new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 옵션 문자열 생성
 */
export function getOptionsString(options?: Record<string, unknown>): string {
  if (!options) return "";
  return Object.values(options)
    .map((opt: Record<string, unknown>) => opt.name)
    .filter(Boolean)
    .join(", ");
}
