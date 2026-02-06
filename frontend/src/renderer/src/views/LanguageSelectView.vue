<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const router = useRouter();
const { locale, t } = useI18n();

const languages = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

function selectLanguage(code: string) {
  locale.value = code;
  router.push("/menu");
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center bg-kiosk-background p-8">
    <h1 class="mb-12 text-kiosk-2xl font-bold text-kiosk-text">
      {{ t("language.title") }}
    </h1>

    <div class="grid grid-cols-2 gap-6">
      <button
        v-for="lang in languages"
        :key="lang.code"
        class="card-kiosk flex flex-col items-center justify-center p-8 transition-transform hover:scale-105 active:scale-95"
        @click="selectLanguage(lang.code)"
      >
        <span class="mb-4 text-5xl">{{ lang.flag }}</span>
        <span class="text-kiosk-lg font-medium text-kiosk-text">{{ lang.label }}</span>
      </button>
    </div>

    <button class="btn-kiosk-secondary mt-12" @click="router.back()">
      {{ t("common.back") }}
    </button>
  </div>
</template>
