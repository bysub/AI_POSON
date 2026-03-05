/**
 * POSON Kiosk Theme Store
 *
 * VueUse를 활용한 테마 상태 관리
 * - CSS Custom Properties 기반 멀티 테마 지원
 * - 시스템 설정 자동 감지 (다크 모드, 고대비, 모션 감소)
 * - localStorage 자동 저장/복원
 */

import { defineStore } from "pinia";
import {
  useColorMode,
  usePreferredColorScheme,
  usePreferredContrast,
  usePreferredReducedMotion,
  useStorage,
} from "@vueuse/core";
import { computed, ref, watch } from "vue";

// 테마 타입 정의
export type BrandTheme =
  | "classic"
  | "modern"
  | "modern-red"
  | "bootstrap"
  | "material"
  | "dark";

export type ContrastMode = "normal" | "high" | "inverted" | "low";
export type MotionMode = "normal" | "reduced";

// 테마 메타데이터
export interface ThemeMeta {
  id: BrandTheme;
  name: string;
  nameKo: string;
  description: string;
  preview: string; // 프리뷰용 그라데이션
}

// 사용 가능한 테마 목록
export const AVAILABLE_THEMES: ThemeMeta[] = [
  {
    id: "classic",
    name: "Classic",
    nameKo: "기본",
    description: "전통적인 골드/우드 계열 (기본 테마)",
    preview: "linear-gradient(135deg, #b45309, #d97706)",
  },
  {
    id: "modern",
    name: "Modern",
    nameKo: "모던",
    description: "모던 미니멀 (차분한 블루그레이)",
    preview: "linear-gradient(135deg, #4f46e5, #06b6d4)",
  },
  {
    id: "modern-red",
    name: "Modern Red",
    nameKo: "모던 레드",
    description: "세련된 레드 계열",
    preview: "linear-gradient(135deg, #dc2626, #f43f5e)",
  },
  {
    id: "bootstrap",
    name: "Bootstrap",
    nameKo: "부트스트랩",
    description: "Bootstrap 5 스타일 (블루)",
    preview: "linear-gradient(135deg, #0d6efd, #0dcaf0)",
  },
  {
    id: "material",
    name: "Material",
    nameKo: "머티리얼",
    description: "Material Design 3 (딥 퍼플)",
    preview: "linear-gradient(135deg, #6750a4, #7d5260)",
  },
  {
    id: "dark",
    name: "Dark",
    nameKo: "다크",
    description: "다크 모드",
    preview: "linear-gradient(135deg, #1e1e1e, #f97316)",
  },
];

export const useThemeStore = defineStore("theme", () => {
  // ========================================
  // VueUse Composables
  // ========================================

  // 테마 모드 (data-theme 속성 자동 관리)
  const colorMode = useColorMode({
    attribute: "data-theme",
    initialValue: "classic" as unknown as "light",
    modes: {
      classic: "classic",
      modern: "modern",
      "modern-red": "modern-red",
      bootstrap: "bootstrap",
      material: "material",
      dark: "dark",
      // VueUse auto 모드 해석 시 light/dark → 커스텀 테마 매핑
      light: "classic",
    },
    storageKey: "poson-theme",
    disableTransition: false,
  });

  // 시스템 설정 감지
  const systemColorScheme = usePreferredColorScheme();
  const systemContrast = usePreferredContrast();
  const reducedMotion = usePreferredReducedMotion();

  // 사용자 설정 저장
  const userContrastMode = useStorage<ContrastMode>("poson-contrast", "normal");
  const followSystemTheme = useStorage<boolean>("poson-follow-system", false);
  const followSystemContrast = useStorage<boolean>("poson-follow-system-contrast", true);
  const followSystemMotion = useStorage<boolean>("poson-follow-system-motion", true);

  // 테마 프리뷰 상태 (마우스 호버 시)
  const previewTheme = ref<BrandTheme | null>(null);
  const isPreviewActive = ref(false);

  // ========================================
  // Computed Properties
  // ========================================

  // 현재 활성 테마
  const currentTheme = computed<BrandTheme>(() => {
    if (isPreviewActive.value && previewTheme.value) {
      return previewTheme.value;
    }
    return colorMode.value as BrandTheme;
  });

  // 현재 테마 메타데이터
  const currentThemeMeta = computed(() => {
    return AVAILABLE_THEMES.find((t) => t.id === currentTheme.value) || AVAILABLE_THEMES[0];
  });

  // 현재 대비 모드
  const currentContrastMode = computed<ContrastMode>(() => {
    if (followSystemContrast.value) {
      if (systemContrast.value === "more") return "high";
      if (systemContrast.value === "less") return "low";
    }
    return userContrastMode.value;
  });

  // 모션 감소 여부
  const isReducedMotion = computed(() => {
    if (followSystemMotion.value) {
      return reducedMotion.value === "reduce";
    }
    return false;
  });

  // 다크 테마 여부
  const isDarkTheme = computed(() => {
    return currentTheme.value === "dark" || currentContrastMode.value === "inverted";
  });

  // ========================================
  // Watchers - DOM 속성 동기화
  // ========================================

  // 대비 모드 적용
  watch(
    currentContrastMode,
    (mode) => {
      const html = document.documentElement;
      if (mode === "normal") {
        delete html.dataset.contrast;
      } else {
        html.dataset.contrast = mode;
      }
    },
    { immediate: true }
  );

  // 모션 감소 적용
  watch(
    isReducedMotion,
    (reduced) => {
      const html = document.documentElement;
      if (reduced) {
        html.dataset.motion = "reduced";
      } else {
        delete html.dataset.motion;
      }
    },
    { immediate: true }
  );

  // 시스템 다크 모드 추종 (옵션)
  watch(
    [systemColorScheme, followSystemTheme],
    ([scheme, follow]) => {
      if (follow && scheme === "dark" && colorMode.value !== "dark") {
        colorMode.value = "dark";
      }
    },
    { immediate: true }
  );

  // ========================================
  // Actions
  // ========================================

  /**
   * 테마 변경
   */
  function setTheme(theme: BrandTheme): void {
    colorMode.value = theme;
    // VueUse의 watch가 flush: "post"라 즉시 반영 안 될 수 있으므로 직접 설정
    document.documentElement.setAttribute("data-theme", theme);
  }

  /**
   * 대비 모드 변경
   */
  function setContrastMode(mode: ContrastMode): void {
    userContrastMode.value = mode;
    followSystemContrast.value = false;
  }

  /**
   * 시스템 대비 모드 추종 설정
   */
  function setFollowSystemContrast(follow: boolean): void {
    followSystemContrast.value = follow;
  }

  /**
   * 시스템 테마 추종 설정
   */
  function setFollowSystemTheme(follow: boolean): void {
    followSystemTheme.value = follow;
  }

  /**
   * 테마 프리뷰 시작 (마우스 호버)
   */
  function startPreview(theme: BrandTheme): void {
    previewTheme.value = theme;
    isPreviewActive.value = true;
    document.documentElement.dataset.theme = theme;
  }

  /**
   * 테마 프리뷰 종료
   */
  function cancelPreview(): void {
    isPreviewActive.value = false;
    previewTheme.value = null;
    document.documentElement.dataset.theme = colorMode.value as string;
  }

  /**
   * 테마 사이클 (다음 테마로 전환)
   */
  function cycleTheme(): void {
    const currentIndex = AVAILABLE_THEMES.findIndex((t) => t.id === currentTheme.value);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    setTheme(AVAILABLE_THEMES[nextIndex].id);
  }

  /**
   * 테마 및 대비 모드 초기화
   */
  function reset(): void {
    colorMode.value = "classic";
    userContrastMode.value = "normal";
    followSystemTheme.value = false;
    followSystemContrast.value = true;
    followSystemMotion.value = true;
  }

  /**
   * 현재 테마 설정 내보내기
   */
  function exportSettings(): {
    theme: BrandTheme;
    contrastMode: ContrastMode;
    followSystemTheme: boolean;
    followSystemContrast: boolean;
    followSystemMotion: boolean;
  } {
    return {
      theme: colorMode.value as BrandTheme,
      contrastMode: userContrastMode.value,
      followSystemTheme: followSystemTheme.value,
      followSystemContrast: followSystemContrast.value,
      followSystemMotion: followSystemMotion.value,
    };
  }

  /**
   * 테마 설정 가져오기
   */
  function importSettings(settings: ReturnType<typeof exportSettings>): void {
    colorMode.value = settings.theme;
    userContrastMode.value = settings.contrastMode;
    followSystemTheme.value = settings.followSystemTheme;
    followSystemContrast.value = settings.followSystemContrast;
    followSystemMotion.value = settings.followSystemMotion;
  }

  return {
    // State
    colorMode,
    systemColorScheme,
    systemContrast,
    reducedMotion,
    userContrastMode,
    followSystemTheme,
    followSystemContrast,
    followSystemMotion,
    previewTheme,
    isPreviewActive,

    // Computed
    currentTheme,
    currentThemeMeta,
    currentContrastMode,
    isReducedMotion,
    isDarkTheme,

    // Constants
    availableThemes: AVAILABLE_THEMES,

    // Actions
    setTheme,
    setContrastMode,
    setFollowSystemContrast,
    setFollowSystemTheme,
    startPreview,
    cancelPreview,
    cycleTheme,
    reset,
    exportSettings,
    importSettings,
  };
});
