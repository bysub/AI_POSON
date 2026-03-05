<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category } from "@/types";
import type { SupportedLocale } from "@/stores/locale";
import { getImageSrc } from "@/utils/image";

const props = defineProps<{
  categories: Category[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  select: [categoryId: number];
}>();

const { locale } = useI18n();

/**
 * 현재 언어에 맞는 카테고리 이름 반환
 */
function getCategoryName(category: Category): string {
  const currentLocale = locale.value as SupportedLocale;

  switch (currentLocale) {
    case "en":
      return category.nameEn || category.name;
    case "ja":
      return category.nameJa || category.name;
    case "zh":
      return category.nameZh || category.name;
    default:
      return category.name;
  }
}

/**
 * 이미지 URL에서 아이콘 ID 추출
 */
function getIconFromUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return "tag";
  if (imageUrl.startsWith("icon:")) {
    return imageUrl.replace("icon:", "");
  }
  return "custom";
}

/**
 * 프리셋 아이콘인지 확인
 */
function isPresetIcon(imageUrl: string | undefined): boolean {
  return !imageUrl || imageUrl.startsWith("icon:");
}

// 아이콘 색상 맵
const iconColors: Record<string, { bg: string; text: string }> = {
  tag: { bg: "bg-purple-100", text: "text-purple-600" },
  coffee: { bg: "bg-amber-100", text: "text-amber-700" },
  drink: { bg: "bg-blue-100", text: "text-blue-600" },
  food: { bg: "bg-orange-100", text: "text-orange-600" },
  dessert: { bg: "bg-pink-100", text: "text-pink-600" },
  bread: { bg: "bg-yellow-100", text: "text-yellow-700" },
  ice: { bg: "bg-cyan-100", text: "text-cyan-600" },
  salad: { bg: "bg-green-100", text: "text-green-600" },
  pizza: { bg: "bg-red-100", text: "text-red-600" },
  burger: { bg: "bg-orange-100", text: "text-orange-700" },
  noodle: { bg: "bg-amber-100", text: "text-amber-600" },
  rice: { bg: "bg-emerald-100", text: "text-emerald-600" },
};

function getIconColors(iconId: string): { bg: string; text: string } {
  return iconColors[iconId] || iconColors.tag;
}

const sortedCategories = computed(() =>
  [...props.categories].sort((a, b) => a.sortOrder - b.sortOrder),
);
</script>

<template>
  <aside class="flex w-52 flex-col overflow-y-auto p-3" style="background: var(--theme-bg-secondary, #f3f4f6)">
    <nav class="flex flex-col gap-2">
      <button
        v-for="category in sortedCategories"
        :key="category.id"
        class="flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-200"
        :class="[
          selectedId === category.id
            ? 'scale-[1.02] shadow-lg'
            : 'hover:shadow-md active:scale-[0.98]',
        ]"
        :style="
          selectedId === category.id
            ? { background: 'var(--theme-primary)', color: 'var(--theme-primary-text, #fff)' }
            : { background: 'var(--theme-surface, #fff)', color: 'var(--theme-text, #1f2937)' }
        "
        @click="emit('select', category.id)"
      >
        <!-- Preset Icon -->
        <div
          v-if="isPresetIcon(category.imageUrl)"
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
          :class="getIconColors(getIconFromUrl(category.imageUrl)).bg"
        >
          <!-- Tag -->
          <svg
            v-if="getIconFromUrl(category.imageUrl) === 'tag'"
            class="h-6 w-6"
            :class="getIconColors('tag').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <!-- Coffee -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'coffee'"
            class="h-6 w-6"
            :class="getIconColors('coffee').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18 8h1a4 4 0 010 8h-1M6 8h12v9a4 4 0 01-4 4H10a4 4 0 01-4-4V8z"
            />
          </svg>
          <!-- Drink -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'drink'"
            class="h-6 w-6"
            :class="getIconColors('drink').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <!-- Food -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'food'"
            class="h-6 w-6"
            :class="getIconColors('food').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <!-- Dessert -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'dessert'"
            class="h-6 w-6"
            :class="getIconColors('dessert').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
            />
          </svg>
          <!-- Bread -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'bread'"
            class="h-6 w-6"
            :class="getIconColors('bread').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <!-- Ice -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'ice'"
            class="h-6 w-6"
            :class="getIconColors('ice').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <!-- Salad -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'salad'"
            class="h-6 w-6"
            :class="getIconColors('salad').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <!-- Pizza -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'pizza'"
            class="h-6 w-6"
            :class="getIconColors('pizza').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <!-- Burger -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'burger'"
            class="h-6 w-6"
            :class="getIconColors('burger').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          <!-- Noodle -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'noodle'"
            class="h-6 w-6"
            :class="getIconColors('noodle').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <!-- Rice -->
          <svg
            v-else-if="getIconFromUrl(category.imageUrl) === 'rice'"
            class="h-6 w-6"
            :class="getIconColors('rice').text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <!-- Default -->
          <svg
            v-else
            class="h-6 w-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </div>

        <!-- Custom Image -->
        <div v-else class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg" style="background: var(--theme-bg-secondary, #e5e7eb)">
          <img
            :src="getImageSrc(category.imageUrl)"
            :alt="getCategoryName(category)"
            class="h-full w-full object-cover"
          />
        </div>

        <!-- Category Name -->
        <span class="text-kiosk-base font-medium leading-tight">
          {{ getCategoryName(category) }}
        </span>
      </button>
    </nav>
  </aside>
</template>
