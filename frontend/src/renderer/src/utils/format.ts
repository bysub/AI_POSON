/**
 * 숫자 포맷팅 (통화 기호 없음)
 */
export function formatNumber(price: number | string): string {
  return new Intl.NumberFormat("ko-KR").format(Number(price));
}

/**
 * 가격 포맷팅 (₩ 포함)
 */
export function formatPrice(price: number | string): string {
  return "\u20A9" + new Intl.NumberFormat("ko-KR").format(Number(price));
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
