import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiClient, RateLimitError } from "@/services/api/client";

export interface Admin {
  id: string;
  username: string;
  name?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";
}

interface LoginResponse {
  success: boolean;
  data: {
    user: Admin;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const useAuthStore = defineStore("auth", () => {
  const admin = ref<Admin | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 로그인 상태
  const isAuthenticated = computed(() => !!accessToken.value && !!admin.value);

  // 권한 체크
  const isAdmin = computed(() => {
    if (!admin.value) return false;
    return ["SUPER_ADMIN", "ADMIN"].includes(admin.value.role);
  });

  const isManager = computed(() => {
    if (!admin.value) return false;
    return ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(admin.value.role);
  });

  /**
   * 로그인
   */
  async function login(username: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post<LoginResponse>("/api/v1/auth/login", {
        username,
        password,
      });

      if (response.data.success && response.data.data) {
        admin.value = response.data.data.user;
        accessToken.value = response.data.data.accessToken;
        refreshToken.value = response.data.data.refreshToken;

        // 로컬 스토리지에 저장
        localStorage.setItem("accessToken", response.data.data.accessToken);
        localStorage.setItem("refreshToken", response.data.data.refreshToken);
        localStorage.setItem("admin", JSON.stringify(response.data.data.user));

        return true;
      }

      error.value = response.data.error?.message ?? "로그인에 실패했습니다";
      return false;
    } catch (err) {
      console.error("Login failed:", err);
      if (err instanceof RateLimitError) {
        error.value = err.message;
      } else {
        error.value = "로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 로그아웃
   */
  function logout(): void {
    admin.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    error.value = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("admin");
  }

  /**
   * 저장된 인증 정보 복원
   */
  function restoreAuth(): boolean {
    const savedToken = localStorage.getItem("accessToken");
    const savedRefresh = localStorage.getItem("refreshToken");
    const savedAdmin = localStorage.getItem("admin");

    if (savedToken && savedAdmin) {
      try {
        accessToken.value = savedToken;
        refreshToken.value = savedRefresh;
        admin.value = JSON.parse(savedAdmin);
        return true;
      } catch {
        logout();
      }
    }

    return false;
  }

  /**
   * 토큰 가져오기 (API 요청용)
   */
  function getAccessToken(): string | null {
    return accessToken.value;
  }

  return {
    // State (S-18: accessToken/refreshToken ref 비공개 — getter만 노출)
    admin,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    isAdmin,
    isManager,

    // Actions
    login,
    logout,
    restoreAuth,
    getAccessToken,
  };
});
