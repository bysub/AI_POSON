<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Category } from "@/types";
import { getImageSrc } from "@/utils/image";
import { getLocalizedName } from "@/utils/i18n";

defineProps<{
  categories: Category[];
  selectedId: number;
}>();

const emit = defineEmits<{
  select: [categoryId: number | null];
}>();

const { locale } = useI18n();

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
  apps: { bg: "bg-amber-400", text: "text-white" },
};

function getIconFromUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return "tag";
  if (imageUrl.startsWith("icon:")) return imageUrl.replace("icon:", "");
  return "custom";
}

function isPresetIcon(imageUrl: string | undefined): boolean {
  return !imageUrl || imageUrl.startsWith("icon:");
}

function getIconColors(iconId: string): { bg: string; text: string } {
  return iconColors[iconId] || iconColors.tag;
}

function handleSelect(categoryId: number) {
  emit("select", categoryId === 0 ? null : categoryId);
}
</script>

<template>
  <aside class="flex w-28 flex-col items-center gap-2 overflow-y-auto bg-white py-4 shadow-sm">
    <button
      v-for="category in categories"
      :key="category.id"
      role="tab"
      :aria-pressed="selectedId === category.id"
      :aria-label="getLocalizedName(category, locale)"
      class="flex w-20 flex-col items-center gap-1 rounded-xl p-2 transition-all"
      :class="[
        selectedId === category.id
          ? 'bg-amber-400 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100',
      ]"
      @click="handleSelect(category.id)"
    >
      <!-- 전체 카테고리 (apps 아이콘) -->
      <div
        v-if="category.id === 0"
        class="flex h-10 w-10 items-center justify-center rounded-full"
        :class="selectedId === 0 ? 'bg-amber-500' : 'bg-gray-100'"
      >
        <svg
          class="h-5 w-5"
          :class="selectedId === 0 ? 'text-white' : 'text-gray-600'"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
          />
        </svg>
      </div>
      <!-- 프리셋 아이콘 -->
      <div
        v-else-if="isPresetIcon(category.imageUrl)"
        class="flex h-10 w-10 items-center justify-center rounded-full"
        :class="
          selectedId === category.id
            ? 'bg-amber-500'
            : getIconColors(getIconFromUrl(category.imageUrl)).bg
        "
      >
        <!-- Coffee -->
        <svg
          v-if="getIconFromUrl(category.imageUrl) === 'coffee'"
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('coffee').text"
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
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('drink').text"
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
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('food').text"
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
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('dessert').text"
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
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('bread').text"
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
        <!-- Default Tag -->
        <svg
          v-else
          class="h-5 w-5"
          :class="selectedId === category.id ? 'text-white' : getIconColors('tag').text"
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
      <!-- 커스텀 이미지 -->
      <div
        v-else
        class="h-10 w-10 overflow-hidden rounded-full"
        :class="selectedId === category.id ? 'ring-2 ring-amber-500' : 'bg-gray-100'"
      >
        <img
          :src="getImageSrc(category.imageUrl)"
          :alt="getLocalizedName(category, locale)"
          class="h-full w-full border-2 border-white object-cover"
        >
      </div>
      <span class="text-center text-[14px] font-medium leading-tight">
        {{ getLocalizedName(category, locale) }}
      </span>
    </button>
  </aside>
</template>
