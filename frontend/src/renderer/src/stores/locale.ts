import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { Ref } from "vue";

export type SupportedLocale = "ko" | "en" | "ja" | "zh";

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
];

const LOCALE_STORAGE_KEY = "poson-kiosk-locale";

export const useLocaleStore = defineStore("locale", () => {
  // 저장된 언어 또는 기본값(한국어) 사용
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
  const currentLocale: Ref<SupportedLocale> = ref(savedLocale || "ko");

  // 언어 변경 시 localStorage에 저장
  watch(currentLocale, (newLocale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  });

  /**
   * 언어 설정
   */
  function setLocale(locale: SupportedLocale): void {
    if (SUPPORTED_LOCALES.some((l) => l.code === locale)) {
      currentLocale.value = locale;
    }
  }

  /**
   * 현재 언어 정보 가져오기
   */
  function getCurrentLocaleInfo(): LocaleInfo {
    return SUPPORTED_LOCALES.find((l) => l.code === currentLocale.value) || SUPPORTED_LOCALES[0];
  }

  /**
   * 지원 언어 목록 가져오기
   */
  function getSupportedLocales(): LocaleInfo[] {
    return SUPPORTED_LOCALES;
  }

  /**
   * 언어 초기화 (세션 종료 시)
   */
  function resetLocale(): void {
    currentLocale.value = "ko";
  }

  return {
    currentLocale,
    setLocale,
    getCurrentLocaleInfo,
    getSupportedLocales,
    resetLocale,
  };
});
