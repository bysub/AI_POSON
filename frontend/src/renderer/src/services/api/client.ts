import type { Product, Category, Order } from "../../types";
import type { ApiClient } from "../sync/sync-manager";
import { API_BASE_URL } from "../../config";

/**
 * API 응답 타입
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * API 클라이언트 설정
 */
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * HTTP API 클라이언트
 */
export class HttpApiClient implements ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * HTTP 요청 실행
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message ?? "API request failed");
      }

      return json.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      throw error;
    }
  }

  /**
   * 상품 목록 조회
   */
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>("GET", "/api/v1/products");
  }

  /**
   * 카테고리 목록 조회
   */
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>("GET", "/api/v1/categories");
  }

  /**
   * 주문 생성
   */
  async createOrder(order: Omit<Order, "id">): Promise<Order> {
    return this.request<Order>("POST", "/api/v1/orders", order);
  }

  /**
   * 주문 수정
   */
  async updateOrder(id: string, order: Partial<Order>): Promise<Order> {
    return this.request<Order>("PUT", `/api/v1/orders/${id}`, order);
  }

  /**
   * 주문 조회
   */
  async getOrder(id: string): Promise<Order> {
    return this.request<Order>("GET", `/api/v1/orders/${id}`);
  }

  /**
   * 결제 요청
   */
  async processPayment(paymentData: unknown): Promise<unknown> {
    return this.request<unknown>("POST", "/api/v1/payments", paymentData);
  }

  /**
   * 결제 취소
   */
  async cancelPayment(transactionId: string, vanCode: string): Promise<unknown> {
    return this.request<unknown>("POST", `/api/v1/payments/${transactionId}/cancel`, {
      vanCode,
    });
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>("GET", "/api/health");
  }
}

/**
 * 기본 API 클라이언트 생성
 */
export function createApiClient(baseUrl?: string): HttpApiClient {
  return new HttpApiClient({
    baseUrl: baseUrl ?? API_BASE_URL,
    timeout: 30000,
  });
}

/**
 * 기본 API 클라이언트 인스턴스 (axios 호환 인터페이스)
 */
const BASE_URL = API_BASE_URL;

/**
 * 저장된 액세스 토큰 가져오기
 */
function getStoredToken(): string | null {
  return localStorage.getItem("accessToken");
}

/**
 * 토큰 갱신 상태 (중복 갱신 방지)
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * 리프레시 토큰으로 액세스 토큰 갱신
 */
async function tryRefreshToken(): Promise<boolean> {
  // 이미 갱신 중이면 기존 Promise 재사용
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data) {
        localStorage.setItem("accessToken", data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 인증 실패 시 로그아웃 처리
 */
function handleAuthFailure(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("admin");

  // 현재 관리자 페이지에 있으면 로그인으로 리디렉트
  if (window.location.hash.includes("/admin") && !window.location.hash.includes("/admin/login")) {
    window.location.hash = "#/admin/login";
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, unknown>,
): Promise<{ data: T }> {
  const queryString = params
    ? "?" + new URLSearchParams(params as Record<string, string>).toString()
    : "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // FormData인지 확인
    const isFormData = body instanceof FormData;

    // 헤더 구성 (인증 토큰 포함)
    const headers: Record<string, string> = {};

    // FormData가 아닌 경우에만 Content-Type 설정
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${url}${queryString}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401 에러 시 토큰 갱신 시도 후 재요청
    if (response.status === 401 && !url.includes("/auth/")) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // 갱신 성공 → 새 토큰으로 재요청
        const newToken = getStoredToken();
        const retryHeaders: Record<string, string> = {};
        if (!isFormData) retryHeaders["Content-Type"] = "application/json";
        if (newToken) retryHeaders["Authorization"] = `Bearer ${newToken}`;

        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);

        const retryResponse = await fetch(`${BASE_URL}${url}${queryString}`, {
          method,
          headers: retryHeaders,
          body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
          signal: retryController.signal,
        });

        clearTimeout(retryTimeoutId);
        const retryData = await retryResponse.json();

        if (!retryResponse.ok) {
          if (retryResponse.status === 401) handleAuthFailure();
          const msg =
            (retryData as { error?: { message?: string }; message?: string })?.error?.message ??
            (retryData as { message?: string })?.message ??
            `요청 실패 (${retryResponse.status})`;
          throw new Error(msg);
        }

        return { data: retryData as T };
      }

      // 갱신 실패 → 로그아웃 처리
      handleAuthFailure();
    }

    const data = await response.json();

    if (!response.ok) {
      const msg =
        (data as { error?: { message?: string }; message?: string })?.error?.message ??
        (data as { message?: string })?.message ??
        `요청 실패 (${response.status})`;
      throw new Error(msg);
    }

    return { data: data as T };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("API request failed");
  }
}

export const apiClient = {
  get: <T>(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: T }> => {
    return request<T>("GET", url, undefined, config?.params);
  },

  post: <T>(url: string, body?: unknown): Promise<{ data: T }> => {
    return request<T>("POST", url, body);
  },

  patch: <T>(url: string, body?: unknown): Promise<{ data: T }> => {
    return request<T>("PATCH", url, body);
  },

  put: <T>(url: string, body?: unknown): Promise<{ data: T }> => {
    return request<T>("PUT", url, body);
  },

  delete: <T>(url: string): Promise<{ data: T }> => {
    return request<T>("DELETE", url);
  },
};
