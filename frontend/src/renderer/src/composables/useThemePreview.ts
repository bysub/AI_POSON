/**
 * 테마 프리뷰 Composable
 *
 * 관리자 화면에서 테마를 미리보기할 때 사용
 * 마우스 호버 시 일시적으로 테마를 적용하고,
 * 마우스가 떠나면 원래 테마로 복원
 */

import { ref, onUnmounted } from "vue";
import { useThemeStore, type BrandTheme } from "@/stores/theme";

export function useThemePreview() {
  const themeStore = useThemeStore();
  const isHovering = ref(false);
  const hoverTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 테마 프리뷰 시작 (마우스 호버)
   * 딜레이를 두어 빠른 마우스 이동 시 깜빡임 방지
   */
  function startPreview(theme: BrandTheme, delay = 150): void {
    // 이전 타임아웃 취소
    if (hoverTimeout.value) {
      clearTimeout(hoverTimeout.value);
    }

    hoverTimeout.value = setTimeout(() => {
      isHovering.value = true;
      themeStore.startPreview(theme);
    }, delay);
  }

  /**
   * 테마 프리뷰 종료
   */
  function cancelPreview(): void {
    if (hoverTimeout.value) {
      clearTimeout(hoverTimeout.value);
      hoverTimeout.value = null;
    }

    if (isHovering.value) {
      isHovering.value = false;
      themeStore.cancelPreview();
    }
  }

  /**
   * 테마 선택 (실제 적용)
   */
  function selectTheme(theme: BrandTheme): void {
    cancelPreview();
    themeStore.setTheme(theme);
  }

  /**
   * 현재 프리뷰 중인지 확인
   */
  function isPreviewingTheme(theme: BrandTheme): boolean {
    return isHovering.value && themeStore.previewTheme === theme;
  }

  // 컴포넌트 언마운트 시 정리
  onUnmounted(() => {
    cancelPreview();
  });

  return {
    isHovering,
    startPreview,
    cancelPreview,
    selectTheme,
    isPreviewingTheme,
  };
}
