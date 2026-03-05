<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocaleStore, type SupportedLocale } from "../stores/locale";
import { useCartStore } from "../stores/cart";
import { useSettingsStore } from "../stores/settings";
import { useAccessibilityStore } from "../stores/accessibility";
import { useThemeStore } from "../stores/theme";
import { useTTS } from "@/composables/useTTS";
import flagKr from "@/assets/images/flags/kr.svg";
import flagUs from "@/assets/images/flags/us.svg";
import flagJp from "@/assets/images/flags/jp.svg";
import flagCn from "@/assets/images/flags/cn.svg";

const router = useRouter();
const cartStore = useCartStore();
const settingsStore = useSettingsStore();
const localeStore = useLocaleStore();
const accessibilityStore = useAccessibilityStore();
const themeStore = useThemeStore();
const tts = useTTS();

const { locale, t } = useI18n();

const languages = localeStore.getSupportedLocales();
const selectedLang = ref<SupportedLocale>(localeStore.currentLocale);

// 웰컴 페이지 진입 시 전체 세션 초기화
onMounted(async () => {
  // 장바구니 초기화 (items, currentOrder, orderError)
  cartStore.clear();
  // 언어 초기화 (한국어로 리셋)
  localeStore.resetLocale();
  locale.value = "ko";
  selectedLang.value = "ko";
  // 설정 로딩 (API 완료 대기 후 접근성 초기화)
  await settingsStore.initialize();
  // 접근성 초기화 (관리자 기본값으로 리셋)
  accessibilityStore.initialize();
  accessibilityStore.resetToDefaults();
  // 테마 초기화 (기본 테마로 리셋)
  themeStore.reset();
  // TTS 웰컴 안내
  tts.speak(t("a11y.tts.welcome"));
});

// 관리자 모드 진입 (로고 5회 탭)
const adminTapCount = ref(0);
let adminTapTimeout: ReturnType<typeof setTimeout> | null = null;

// 언어별 국기 이미지 (로컬 SVG — 오프라인 동작 보장)
const flagImages: Record<SupportedLocale, string> = {
  ko: flagKr,
  en: flagUs,
  ja: flagJp,
  zh: flagCn,
};

function selectLanguage(code: SupportedLocale) {
  selectedLang.value = code;
  locale.value = code;
  localeStore.setLocale(code);
  // 변경된 언어로 환영 안내
  tts.speak(t("a11y.tts.welcome"));
}

function startOrder(type: "DINE_IN" | "TAKEOUT") {
  cartStore.setOrderType(type);
  tts.speak(t(type === "DINE_IN" ? "a11y.tts.dineIn" : "a11y.tts.takeout"));
  router.push("/menu");
}

function handleLogoTap() {
  adminTapCount.value++;

  // 3초 내에 5회 탭하면 관리자 모드 진입
  if (adminTapTimeout) {
    clearTimeout(adminTapTimeout);
  }

  if (adminTapCount.value >= 5) {
    adminTapCount.value = 0;
    router.push("/admin");
    return;
  }

  adminTapTimeout = setTimeout(() => {
    adminTapCount.value = 0;
  }, 3000);
}
</script>

<template>
  <div
    class="bg-welcome relative flex h-full w-full flex-col items-center justify-between overflow-hidden"
  >
    <!-- 그라데이션 오버레이 -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

    <!-- 헤더: 로고 & 브랜드 (로고 5회 탭 → 관리자 모드) -->
    <header class="relative z-10 flex w-full flex-col items-center gap-2 pt-16">
      <button
        class="cursor-default rounded-full bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-transform active:scale-95"
        @click="handleLogoTap"
      >
        <svg
          class="h-12 w-12 text-theme-primary"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
          />
        </svg>
      </button>
      <h1
        class="mt-6 text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
      >
        {{ settingsStore.get("biz.name") || t("welcome.brandName", "POSON Kiosk") }}
      </h1>
      <p
        class="text-sm font-semibold uppercase tracking-widest text-cream opacity-90 drop-shadow-md"
      >
        {{ t("welcome.subtitle", "Select to Begin") }}
      </p>
    </header>

    <!-- 메인: 매장/포장 선택 버튼 -->
    <main
      role="main"
      :aria-label="t('welcome.selectOrderType', '주문 유형 선택')"
      class="relative z-10 flex w-full flex-1 items-center justify-center px-8"
    >
      <div class="flex w-full max-w-[420px] gap-5">
        <!-- 매장 버튼 -->
        <button
          class="group relative flex flex-1 flex-col items-center justify-center rounded-[2rem] py-10 transition-all duration-300 active:scale-95"
          @click="startOrder('DINE_IN')"
        >
          <div class="absolute inset-0 scale-105 rounded-[2rem] bg-theme-primary/25 blur-xl" />
          <div
            class="absolute inset-0 rounded-[2rem] border-[4px] border-white/30 bg-gradient-to-br from-theme-primary via-theme-primary to-theme-accent glow-primary"
          />
          <div class="relative z-20 flex flex-col items-center gap-3">
            <svg class="h-14 w-14 text-theme-primary-text" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
            </svg>
            <span class="text-2xl font-extrabold tracking-wide text-theme-primary-text drop-shadow-lg">
              {{ t("orderConfirm.dineIn") }}
            </span>
          </div>
        </button>

        <!-- 포장 버튼 -->
        <button
          class="group relative flex flex-1 flex-col items-center justify-center rounded-[2rem] py-10 transition-all duration-300 active:scale-95"
          @click="startOrder('TAKEOUT')"
        >
          <div class="absolute inset-0 scale-105 rounded-[2rem] bg-white/15 blur-xl" />
          <div
            class="absolute inset-0 rounded-[2rem] border-[4px] border-white/30 bg-white/20 backdrop-blur-sm"
          />
          <div class="relative z-20 flex flex-col items-center gap-3">
            <svg class="h-14 w-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span class="text-2xl font-extrabold tracking-wide text-white drop-shadow-lg">
              {{ t("orderConfirm.takeout") }}
            </span>
          </div>
        </button>
      </div>
    </main>

    <!-- 푸터: 언어 선택 -->
    <footer class="relative z-10 w-full px-6 pb-10">
      <div
        class="flex flex-col gap-5 rounded-[2rem] border border-white/20 bg-black/40 p-5 shadow-2xl backdrop-blur-2xl"
      >
        <div class="flex flex-col items-center gap-1">
          <p class="text-center text-xs font-bold uppercase tracking-[0.25em] text-white/80">
            {{ t("language.title", "Language Selection") }}
          </p>
          <div class="h-1 w-12 rounded-full bg-theme-accent" />
        </div>

        <div class="hide-scrollbar flex items-center justify-center gap-5 overflow-x-auto">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="flex min-w-[70px] flex-col items-center gap-2 transition-transform active:scale-95"
            @click="selectLanguage(lang.code)"
          >
            <div
              :class="[
                'size-14 overflow-hidden rounded-full p-0.5 transition-all duration-200',
                selectedLang === lang.code
                  ? 'border-[3px] border-theme-accent bg-white/20 glow-accent'
                  : 'border-2 border-white/40 bg-white/10 shadow-lg',
              ]"
            >
              <img
                :alt="lang.code.toUpperCase()"
                :src="flagImages[lang.code]"
                class="h-full w-full rounded-full object-cover"
              >
            </div>
            <span
              :class="[
                'transition-all duration-200',
                selectedLang === lang.code
                  ? 'text-sm font-black text-theme-accent'
                  : 'text-[13px] font-bold text-white/90',
              ]"
            >
              {{ lang.nativeName }}
            </span>
          </button>
        </div>
      </div>
    </footer>

    <!-- 버전 정보 (개발용) -->
    <div class="absolute bottom-2 right-4 z-10 text-xs text-white/30">
      v1.0.0
    </div>
  </div>
</template>

<style scoped>
/* bg-welcome 클래스는 components.css로 이동됨 - CSS 변수 사용 */
/* hide-scrollbar 클래스는 components.css로 이동됨 */
</style>
