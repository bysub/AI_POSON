/**
 * 애플리케이션 전역 설정
 *
 * 우선순위:
 * 1. VITE_API_URL 환경변수 (빌드 시 고정)
 * 2. POSON_API_URL 환경변수 (Electron main process → preload 동기 주입, 런타임 설정 가능)
 * 3. 개발 모드: "" (Vite proxy 사용)
 * 4. 프로덕션 기본값: "http://localhost:3000"
 */
const electronConfig = (window as Record<string, unknown>).__POSON_CONFIG__ as
  | { apiUrl?: string }
  | undefined;

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ??
  (electronConfig?.apiUrl || null) ??
  (import.meta.env.NODE_ENV ? import.meta.env.VITE_API_URL : "http://localhost:3000");

if (import.meta.env.NODE_ENV) {
  console.log("[Config] API_BASE_URL:", JSON.stringify(API_BASE_URL), "| electronConfig:", electronConfig);
}
