<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category } from "@/types";
import type { SupportedLocale } from "@/stores/locale";

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

const sortedCategories = computed(() =>
  [...props.categories].sort((a, b) => a.sortOrder - b.sortOrder),
);
</script>

<template>
  <aside class="flex w-52 flex-col overflow-y-auto bg-gray-100 p-3">
    <nav class="flex flex-col gap-2">
      <button
        v-for="category in sortedCategories"
        :key="category.id"
        class="flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-200"
        :class="[
          selectedId === category.id
            ? 'scale-[1.02] bg-primary-600 text-white shadow-lg'
            : 'bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md active:scale-[0.98]',
        ]"
        @click="emit('select', category.id)"
      >
        <!-- Category Image -->
        <div
          v-if="category.imageUrl"
          class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200"
        >
          <img
            :src="category.imageUrl"
            :alt="getCategoryName(category)"
            class="h-full w-full object-cover"
          >
        </div>

        <!-- Category Name -->
        <span class="text-kiosk-base font-medium leading-tight">
          {{ getCategoryName(category) }}
        </span>
      </button>
    </nav>
  </aside>
</template>
