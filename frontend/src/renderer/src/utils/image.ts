import { API_BASE_URL } from "@/config";

/**
 * /uploads/ 상대경로를 전체 URL로 변환
 */
export function getImageSrc(imageUrl: string | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/uploads/")) {
    return `${API_BASE_URL}${imageUrl}`;
  }
  return imageUrl;
}
