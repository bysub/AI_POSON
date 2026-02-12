/**
 * 다국어 이름을 가진 객체에서 현재 로케일에 맞는 이름 반환
 */
export function getLocalizedName(
  item: { name: string; nameEn?: string; nameJa?: string; nameZh?: string },
  locale: string,
): string {
  switch (locale) {
    case "en":
      return item.nameEn || item.name;
    case "ja":
      return item.nameJa || item.name;
    case "zh":
      return item.nameZh || item.name;
    default:
      return item.name;
  }
}
