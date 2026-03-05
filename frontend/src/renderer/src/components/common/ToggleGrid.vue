<script setup lang="ts">
import type { ToggleItem, SettingsRecord } from "@/views/admin/deviceSettingsData";

defineProps<{
  items: ToggleItem[];
  config: SettingsRecord;
}>();

const emit = defineEmits<{
  toggle: [key: string];
}>();
</script>

<template>
  <div class="grid gap-3 md:grid-cols-2">
    <div
      v-for="item in items"
      :key="item.key"
      class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
    >
      <div>
        <p class="text-sm font-medium text-slate-800">{{ item.title }}</p>
        <p class="text-xs text-slate-500">{{ item.desc }}</p>
      </div>
      <button
        class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
        :class="config[item.key] === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
        @click="emit('toggle', item.key)"
      >
        <span
          class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          :class="config[item.key] === '1' ? 'translate-x-4' : ''"
        />
      </button>
    </div>
  </div>
</template>
