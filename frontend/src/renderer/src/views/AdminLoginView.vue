<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const showPassword = ref(false);

async function handleLogin(): Promise<void> {
  if (!username.value || !password.value) {
    return;
  }

  const success = await authStore.login(username.value, password.value);

  if (success) {
    // redirect 쿼리 파라미터가 있으면 해당 페이지로, 없으면 /admin으로
    const redirectPath = route.query.redirect as string;
    router.push(redirectPath ?? "/admin");
  }
}

function goBack(): void {
  router.push("/");
}

// 이미 로그인되어 있으면 관리자 페이지로
onMounted(() => {
  if (authStore.isAuthenticated || authStore.restoreAuth()) {
    router.replace("/admin");
  }
});
</script>

<template>
  <div class="flex h-full flex-col bg-gray-100">
    <!-- Header -->
    <header class="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
      <h1 class="text-xl font-bold">
        관리자 로그인
      </h1>
      <button
        class="rounded-lg bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
        @click="goBack"
      >
        돌아가기
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 items-center justify-center p-6">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <!-- Logo -->
        <div class="mb-8 flex flex-col items-center">
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
<<<<<<< ours
            <svg class="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
=======
            <svg
              class="h-8 w-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
>>>>>>> theirs
              <path
                d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-800">
            POSON Kiosk
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            관리자 계정으로 로그인하세요
          </p>
        </div>

        <!-- Login Form -->
<<<<<<< ours
        <form class="space-y-5" @submit.prevent="handleLogin">
=======
        <form
          class="space-y-5"
          @submit.prevent="handleLogin"
        >
>>>>>>> theirs
          <!-- Username -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">아이디</label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="관리자 아이디"
            >
          </div>

          <!-- Password -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">비밀번호</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="비밀번호"
              >
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
<<<<<<< ours
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
=======
                <svg
                  v-else
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
>>>>>>> theirs
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="authStore.error"
            class="rounded-lg bg-red-50 p-3 text-sm text-red-600"
          >
            {{ authStore.error }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading || !username || !password"
            class="w-full rounded-xl bg-blue-500 py-3.5 text-base font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
<<<<<<< ours
            <span v-if="authStore.isLoading" class="flex items-center justify-center gap-2">
              <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
=======
            <span
              v-if="authStore.isLoading"
              class="flex items-center justify-center gap-2"
            >
              <svg
                class="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
>>>>>>> theirs
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              로그인 중...
            </span>
            <span v-else>로그인</span>
          </button>
        </form>

        <!-- Info -->
        <p class="mt-6 text-center text-xs text-gray-400">
          관리자 계정이 필요하시면 시스템 관리자에게 문의하세요
        </p>
      </div>
    </main>
  </div>
</template>
