import { db, type LocalOrder, type PendingSync } from "../db";
import type { Product, Category, Order } from "../../types";

/**
 * 동기화 상태
 */
export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  isSyncing: boolean;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * API 클라이언트 인터페이스
 */
export interface ApiClient {
  getProducts(): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
  createOrder(order: Omit<Order, "id">): Promise<Order>;
  updateOrder(id: string, order: Partial<Order>): Promise<Order>;
}

/**
 * 동기화 관리자
 * 오프라인 데이터 동기화 및 충돌 해결
 */
export class SyncManager {
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    lastSyncedAt: null,
    pendingCount: 0,
    isSyncing: false,
  };

  private apiClient: ApiClient | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SYNC_INTERVAL = 30000; // 30초
  private readonly MAX_RETRY_COUNT = 5;

  constructor() {
    this.setupNetworkListeners();
    this.loadStatus();
  }

  /**
   * API 클라이언트 설정
   */
  setApiClient(client: ApiClient): void {
    this.apiClient = client;
  }

  /**
   * 네트워크 이벤트 리스너 설정
   */
  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      console.log("[Sync] Network online");
      this.status.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      console.log("[Sync] Network offline");
      this.status.isOnline = false;
    });
  }

  /**
   * 상태 로드
   */
  private async loadStatus(): Promise<void> {
    const setting = await db.settings.get("lastSyncedAt");
    if (setting) {
      this.status.lastSyncedAt = setting.value as number;
    }

    this.status.pendingCount = await db.pendingSync.count();
  }

  /**
   * 동기화 시작
   */
  startSync(): void {
    if (this.syncInterval) return;

    console.log("[Sync] Starting sync service");

    // 즉시 한 번 실행
    this.syncAll();

    // 주기적 동기화
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, this.SYNC_INTERVAL);
  }

  /**
   * 동기화 중지
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[Sync] Stopped sync service");
    }
  }

  /**
   * 전체 동기화
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.status.isOnline || this.status.isSyncing || !this.apiClient) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.status.isSyncing = true;
    console.log("[Sync] Starting full sync");

    try {
      // 1. 서버에서 마스터 데이터 가져오기
      await this.pullMasterData();

      // 2. 대기 중인 변경사항 동기화
      const result = await this.syncPendingChanges();

      // 3. 마지막 동기화 시간 저장
      this.status.lastSyncedAt = Date.now();
      await db.settings.put({
        key: "lastSyncedAt",
        value: this.status.lastSyncedAt,
        updatedAt: Date.now(),
      });

      console.log("[Sync] Full sync completed", result);
      return result;
    } catch (error) {
      console.error("[Sync] Full sync failed", error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    } finally {
      this.status.isSyncing = false;
    }
  }

  /**
   * 마스터 데이터 가져오기 (상품, 카테고리)
   */
  private async pullMasterData(): Promise<void> {
    if (!this.apiClient) return;

    try {
      // 카테고리 동기화
      const categories = await this.apiClient.getCategories();
      await db.categories.clear();
      await db.categories.bulkPut(
        categories.map((c) => ({
          ...c,
          syncedAt: Date.now(),
        })),
      );
      console.log(`[Sync] Synced ${categories.length} categories`);

      // 상품 동기화
      const products = await this.apiClient.getProducts();
      await db.products.clear();
      await db.products.bulkPut(
        products.map((p) => ({
          ...p,
          syncedAt: Date.now(),
        })),
      );
      console.log(`[Sync] Synced ${products.length} products`);
    } catch (error) {
      console.error("[Sync] Failed to pull master data", error);
      throw error;
    }
  }

  /**
   * 대기 중인 변경사항 동기화
   */
  async syncPendingChanges(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    if (!this.status.isOnline || !this.apiClient) {
      return result;
    }

    const pendingItems = await db.pendingSync.toArray();

    for (const item of pendingItems) {
      try {
        await this.processPendingItem(item);
        await db.pendingSync.delete(item.id!);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `${item.type}/${item.action}: ${error instanceof Error ? error.message : String(error)}`,
        );

        // 재시도 횟수 증가
        const newRetryCount = (item.retryCount || 0) + 1;
        if (newRetryCount >= this.MAX_RETRY_COUNT) {
          // 최대 재시도 횟수 초과 - 삭제
          await db.pendingSync.delete(item.id!);
          console.error(`[Sync] Max retry exceeded for ${item.type}/${item.action}`);
        } else {
          await db.pendingSync.update(item.id!, {
            retryCount: newRetryCount,
            lastError: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.status.pendingCount = await db.pendingSync.count();
    result.success = result.failed === 0;

    return result;
  }

  /**
   * 대기 항목 처리
   */
  private async processPendingItem(item: PendingSync): Promise<void> {
    if (!this.apiClient) throw new Error("API client not set");

    switch (item.type) {
      case "order":
        await this.syncOrder(item);
        break;
      default:
        console.warn(`[Sync] Unknown sync type: ${item.type}`);
    }
  }

  /**
   * 주문 동기화
   */
  private async syncOrder(item: PendingSync): Promise<void> {
    if (!this.apiClient) return;

    const orderData = item.data as LocalOrder;

    if (item.action === "create") {
      const { id: _localId, syncStatus: _syncStatus, ...orderPayload } = orderData;
      const createdOrder = await this.apiClient.createOrder(orderPayload);

      // 로컬 주문 업데이트
      await db.orders.update(orderData.id, {
        syncStatus: "synced",
        syncedAt: Date.now(),
      });

      console.log(`[Sync] Order ${createdOrder.id} synced`);
    }
  }

  /**
   * 주문 저장 (오프라인 지원)
   */
  async saveOrder(order: Omit<Order, "id">): Promise<LocalOrder> {
    const localOrder: LocalOrder = {
      ...order,
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      syncStatus: this.status.isOnline ? "pending" : "pending",
      localCreatedAt: Date.now(),
    };

    // 로컬 저장
    await db.orders.add(localOrder);

    // 동기화 대기열에 추가
    await db.pendingSync.add({
      type: "order",
      action: "create",
      data: localOrder,
      createdAt: Date.now(),
      retryCount: 0,
    });

    this.status.pendingCount++;

    // 온라인이면 즉시 동기화 시도
    if (this.status.isOnline) {
      this.syncPendingChanges();
    }

    return localOrder;
  }

  /**
   * 로컬 상품 조회
   */
  async getProducts(): Promise<Product[]> {
    return db.products.toArray();
  }

  /**
   * 바코드로 상품 조회
   */
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    return db.products.where("barcode").equals(barcode).first();
  }

  /**
   * 카테고리별 상품 조회
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return db.products.where("categoryId").equals(categoryId).toArray();
  }

  /**
   * 로컬 카테고리 조회
   */
  async getCategories(): Promise<Category[]> {
    return db.categories.orderBy("sortOrder").toArray();
  }

  /**
   * 로컬 주문 조회
   */
  async getOrders(): Promise<LocalOrder[]> {
    return db.orders.toArray();
  }

  /**
   * 동기화 상태 조회
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * 강제 동기화
   */
  async forceSync(): Promise<SyncResult> {
    return this.syncAll();
  }
}

// 싱글톤 인스턴스
export const syncManager = new SyncManager();
