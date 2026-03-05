<script setup lang="ts">
import { RouterView } from "vue-router";
import { useThemeStore } from "@/stores/theme";

// 테마 스토어를 앱 시작 시 초기화하여 useColorMode watcher가 즉시 활성화되도록 함
const themeStore = useThemeStore();
</script>

<template>
  <RouterView />
</template>
