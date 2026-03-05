/**
 * 애플리케이션 전역 설정
 *
 * 개발 모드: Vite proxy를 통해 상대 경로("")로 API 요청 → 외부 IP 접속 지원
 * 프로덕션/Electron: VITE_API_URL 환경변수 또는 기본값 사용
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "http://localhost:3000");
