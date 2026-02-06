<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocaleStore, type SupportedLocale } from "../stores/locale";
import { useCartStore } from "../stores/cart";

const router = useRouter();
const cartStore = useCartStore();

// 웰컴 페이지 진입 시 장바구니 초기화
onMounted(() => {
  cartStore.clear();
});
const { locale, t } = useI18n();
const localeStore = useLocaleStore();

const languages = localeStore.getSupportedLocales();
const selectedLang = ref<SupportedLocale>(localeStore.currentLocale);

// 관리자 모드 진입 (로고 5회 탭)
const adminTapCount = ref(0);
let adminTapTimeout: ReturnType<typeof setTimeout> | null = null;

// 언어별 국기 이미지 URL (실제 배포시 로컬 이미지로 교체)
const flagImages: Record<SupportedLocale, string> = {
  ko: "https://flagcdn.com/w80/kr.png",
  en: "https://flagcdn.com/w80/us.png",
  ja: "https://flagcdn.com/w80/jp.png",
  zh: "https://flagcdn.com/w80/cn.png",
};

function selectLanguage(code: SupportedLocale) {
  selectedLang.value = code;
  locale.value = code;
  localeStore.setLocale(code);
}

function startOrder() {
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
        <svg class="h-12 w-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
          />
        </svg>
      </button>
      <h1
        class="mt-6 text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
      >
        {{ t("welcome.brandName", "POSON Kiosk") }}
      </h1>
      <p
        class="text-sm font-semibold uppercase tracking-widest text-cream opacity-90 drop-shadow-md"
      >
        {{ t("welcome.subtitle", "Select to Begin") }}
      </p>
    </header>

    <!-- 메인: Touch To Order 버튼 -->
    <main class="relative z-10 flex w-full flex-1 items-center justify-center px-8">
      <button
        class="group relative flex aspect-square w-full max-w-[280px] flex-col items-center justify-center rounded-full transition-all duration-300 active:scale-95"
        @click="startOrder"
      >
        <!-- 버튼 글로우 효과 -->
        <div class="absolute inset-0 scale-110 rounded-full bg-primary/30 blur-xl" />
        <!-- 버튼 배경 -->
        <div
          class="absolute inset-0 rounded-full border-[6px] border-white/30 bg-gradient-to-br from-primary via-primary to-accent shadow-[0_0_50px_rgba(142,53,36,0.5)]"
        />
        <!-- 버튼 콘텐츠 -->
        <div class="relative z-20 flex flex-col items-center gap-4">
          <svg class="h-16 w-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.21 0-.59-.34-1.09-.91-1.34z"
            />
          </svg>
          <div class="text-center">
            <h2
              class="text-4xl font-bold uppercase leading-none tracking-widest text-white drop-shadow-lg"
            >
              {{ t("welcome.touch", "Touch") }}
            </h2>
            <p class="mt-2 text-xl font-medium text-white opacity-95 drop-shadow-md">
              {{ t("welcome.toOrder", "To Order") }}
            </p>
          </div>
        </div>
      </button>
    </main>

    <!-- 푸터: 언어 선택 -->
    <footer class="relative z-10 w-full px-6 pb-10">
      <div
        class="flex flex-col gap-5 rounded-[2rem] border border-white/20 bg-black/40 p-5 shadow-2xl backdrop-blur-2xl"
      >
        <div class="flex flex-col items-center gap-1">
          <p class="text-center text-xs font-bold uppercase tracking-[0.25em] text-cream/80">
            {{ t("language.title", "Language Selection") }}
          </p>
          <div class="h-1 w-12 rounded-full bg-accent" />
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
                  ? 'border-[3px] border-accent bg-white/20 shadow-[0_0_14px_rgba(201,98,49,0.6)]'
                  : 'border-2 border-white/40 bg-white/10 shadow-lg',
              ]"
            >
              <img
                :alt="lang.code.toUpperCase()"
                :src="flagImages[lang.code]"
                class="h-full w-full rounded-full object-cover"
              />
            </div>
            <span
              :class="[
                'transition-all duration-200',
                selectedLang === lang.code
                  ? 'text-sm font-black text-accent'
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
    <div class="absolute bottom-2 right-4 z-10 text-xs text-white/30">v1.0.0</div>
  </div>
</template>

<style scoped>
.bg-welcome {
  background-image: url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80");
  background-size: cover;
  background-position: center;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
