<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/services/api/client";

interface Product {
  id: number;
  barcode: string;
  name: string;
  stock: number;
  categoryId: number;
  category?: { name: string };
}

const products = ref<Product[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");

async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Product[] }>("/api/v1/products");
    if (res.data.success) products.value = res.data.data;
  } catch (err) {
    console.error("Failed to load products:", err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => loadData());
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">재고현황</h2>
      <p class="mt-1 text-sm text-slate-500">상품별 재고 현황을 확인합니다</p>
    </div>

    <div class="flex gap-4">
      <div class="relative flex-1">
        <svg
          class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="상품명, 바코드로 검색..."
          class="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">상품</th>
            <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
              카테고리
            </th>
            <th class="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
              현재고
            </th>
            <th class="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500">
              상태
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="product in products" :key="product.id" class="hover:bg-slate-50">
            <td class="px-6 py-4">
              <p class="font-medium text-slate-800">
                {{ product.name }}
              </p>
              <p class="text-sm text-slate-500">
                {{ product.barcode }}
              </p>
            </td>
            <td class="px-6 py-4 text-slate-600">
              {{ product.category?.name ?? "-" }}
            </td>
            <td
              class="px-6 py-4 text-right font-semibold"
              :class="
                product.stock > 10
                  ? 'text-green-600'
                  : product.stock > 0
                    ? 'text-amber-600'
                    : 'text-red-600'
              "
            >
              {{ product.stock }}
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  product.stock > 10
                    ? 'bg-green-100 text-green-700'
                    : product.stock > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                "
              >
                {{ product.stock > 10 ? "정상" : product.stock > 0 ? "부족" : "품절" }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
