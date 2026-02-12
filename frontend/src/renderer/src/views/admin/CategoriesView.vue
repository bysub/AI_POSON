<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { Category } from "@/types";
import { apiClient } from "@/services/api/client";
import { showWarningToast, showApiError, showConfirm } from "@/utils/AlertUtils";
import { getImageSrc } from "@/utils/image";

const categories = ref<Category[]>([]);
const isLoading = ref(false);

// 모달 상태
const showForm = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryForm = ref({
  name: "",
  nameEn: "",
  nameJa: "",
  nameZh: "",
  sortOrder: 0,
  imageUrl: "",
  iconType: "preset" as "preset" | "image",
  presetIcon: "tag",
});

// 파일 업로드 관련
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadPreview = ref<string | null>(null);

// 프리셋 아이콘 목록
const presetIcons = [
  { id: "tag", name: "기본", icon: "tag" },
  { id: "coffee", name: "커피", icon: "coffee" },
  { id: "drink", name: "음료", icon: "drink" },
  { id: "food", name: "음식", icon: "food" },
  { id: "dessert", name: "디저트", icon: "dessert" },
  { id: "bread", name: "베이커리", icon: "bread" },
  { id: "ice", name: "아이스크림", icon: "ice" },
  { id: "salad", name: "샐러드", icon: "salad" },
  { id: "pizza", name: "피자", icon: "pizza" },
  { id: "burger", name: "버거", icon: "burger" },
  { id: "noodle", name: "면류", icon: "noodle" },
  { id: "rice", name: "밥류", icon: "rice" },
];

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

async function loadData(): Promise<void> {
  isLoading.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Category[] }>("/api/v1/categories");
    if (res.data.success) categories.value = res.data.data;
  } catch (err) {
    console.error("Failed to load categories:", err);
  } finally {
    isLoading.value = false;
  }
}

function getIconFromUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return "tag";
  if (imageUrl.startsWith("icon:")) {
    return imageUrl.replace("icon:", "");
  }
  return "custom";
}

function getIconColors(iconId: string): { bg: string; text: string } {
  return iconColors[iconId] || iconColors.tag;
}

function openAddForm(): void {
  editingCategory.value = null;
  categoryForm.value = {
    name: "",
    nameEn: "",
    nameJa: "",
    nameZh: "",
    sortOrder: categories.value.length + 1,
    imageUrl: "",
    iconType: "preset",
    presetIcon: "tag",
  };
  uploadPreview.value = null;
  showForm.value = true;
}

// 파일 선택 트리거
function triggerFileInput(): void {
  fileInput.value?.click();
}

// 파일 업로드 처리
async function handleFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  // 파일 크기 체크 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showWarningToast("파일 크기는 5MB를 초과할 수 없습니다.");
    return;
  }

  // 미리보기 생성
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // 서버에 업로드
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>("/api/v1/uploads/image", formData);

    if (res.data.success) {
      categoryForm.value.imageUrl = res.data.data.url;
    }
  } catch (err) {
    console.error("Upload failed:", err);
    showApiError(err, "파일 업로드에 실패했습니다");
    uploadPreview.value = null;
  } finally {
    isUploading.value = false;
    // input 초기화
    input.value = "";
  }
}

// 업로드된 이미지 제거
function removeUploadedImage(): void {
  categoryForm.value.imageUrl = "";
  uploadPreview.value = null;
}

function openEditForm(category: Category): void {
  editingCategory.value = category;
  const iconId = getIconFromUrl(category.imageUrl);
  const isPreset = iconId !== "custom";

  categoryForm.value = {
    name: category.name,
    nameEn: category.nameEn ?? "",
    nameJa: category.nameJa ?? "",
    nameZh: category.nameZh ?? "",
    sortOrder: category.sortOrder,
    imageUrl: isPreset ? "" : (category.imageUrl ?? ""),
    iconType: isPreset ? "preset" : "image",
    presetIcon: isPreset ? iconId : "tag",
  };

  // 기존 이미지가 있으면 미리보기 설정
  if (!isPreset && category.imageUrl) {
    uploadPreview.value = getImageSrc(category.imageUrl);
  } else {
    uploadPreview.value = null;
  }

  showForm.value = true;
}

async function saveCategory(): Promise<void> {
  if (!categoryForm.value.name) {
    showWarningToast("카테고리명은 필수입니다");
    return;
  }

  // 이미지 URL 결정
  let imageUrl = "";
  if (categoryForm.value.iconType === "preset") {
    imageUrl = `icon:${categoryForm.value.presetIcon}`;
  } else {
    imageUrl = categoryForm.value.imageUrl;
  }

  isLoading.value = true;
  try {
    const payload = {
      name: categoryForm.value.name,
      nameEn: categoryForm.value.nameEn,
      nameJa: categoryForm.value.nameJa,
      nameZh: categoryForm.value.nameZh,
      sortOrder: categoryForm.value.sortOrder,
      imageUrl,
    };

    if (editingCategory.value) {
      await apiClient.patch(`/api/v1/categories/${editingCategory.value.id}`, payload);
    } else {
      await apiClient.post("/api/v1/categories", payload);
    }
    showForm.value = false;
    await loadData();
  } catch (err) {
    showApiError(err, "저장에 실패했습니다");
  } finally {
    isLoading.value = false;
  }
}

async function deleteCategory(category: Category): Promise<void> {
  const { isConfirmed } = await showConfirm("카테고리 삭제");
  if (!isConfirmed) return;

  isLoading.value = true;
  try {
    await apiClient.delete(`/api/v1/categories/${category.id}`);
    await loadData();
  } catch (err) {
    showApiError(err, "삭제에 실패했습니다 (연결된 상품이 있을 수 있습니다)");
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">카테고리 관리</h2>
        <p class="mt-1 text-sm text-slate-500">상품을 분류하는 카테고리를 관리합니다</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
        @click="openAddForm"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        카테고리 추가
      </button>
    </div>

    <!-- Categories Grid -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"
      />
    </div>

    <div
      v-else-if="categories.length === 0"
      class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
    >
      <svg
        class="mx-auto mb-4 h-16 w-16 text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <p class="text-lg font-medium text-slate-600">등록된 카테고리가 없습니다</p>
      <p class="mt-1 text-sm text-slate-400">카테고리를 추가하여 상품을 분류하세요</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="category in categories"
        :key="category.id"
        class="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-purple-200 hover:shadow-md"
      >
        <!-- Status Badge -->
        <div class="absolute right-4 top-4">
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="
              category.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            "
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="category.isActive ? 'bg-green-500' : 'bg-slate-400'"
            />
            {{ category.isActive ? "활성" : "비활성" }}
          </span>
        </div>

        <!-- Category Info -->
        <div class="mb-4 flex items-center gap-4">
          <!-- Icon/Image Display -->
          <div
            v-if="!category.imageUrl || category.imageUrl.startsWith('icon:')"
            class="flex h-14 w-14 items-center justify-center rounded-xl"
            :class="getIconColors(getIconFromUrl(category.imageUrl)).bg"
          >
            <!-- Tag -->
            <svg
              v-if="getIconFromUrl(category.imageUrl) === 'tag'"
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 2l.5 2M12 2v2M18 2l-.5 2"
              />
            </svg>
            <!-- Drink -->
            <svg
              v-else-if="getIconFromUrl(category.imageUrl) === 'drink'"
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7"
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
              class="h-7 w-7 text-purple-600"
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
          <div v-else class="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
            <img
              :src="getImageSrc(category.imageUrl)"
              :alt="category.name"
              class="h-full w-full object-cover"
              @error="
                ($event.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22%3E%3Cpath stroke=%22%239ca3af%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z%22/%3E%3C/svg%3E'
              "
            />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-slate-800">
              {{ category.name }}
            </h3>
            <p v-if="category.nameEn" class="text-sm text-slate-500">
              {{ category.nameEn }}
            </p>
          </div>
        </div>

        <!-- Meta -->
        <div class="mb-4 flex items-center gap-4 text-sm text-slate-500">
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
            순서: {{ category.sortOrder }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            @click="openEditForm(category)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            수정
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            @click="deleteCategory(category)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            삭제
          </button>
        </div>
      </div>
    </div>

    <!-- Category Form Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showForm = false"
        >
          <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div class="mb-6 flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-800">
                {{ editingCategory ? "카테고리 수정" : "카테고리 추가" }}
              </h3>
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="showForm = false"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="space-y-5">
              <!-- Basic Info -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카테고리명 (한글) *</label
                  >
                  <input
                    v-model="categoryForm.name"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="카테고리명"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카테고리명 (영문)</label
                  >
                  <input
                    v-model="categoryForm.nameEn"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Category Name"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카테고리명 (일본어)</label
                  >
                  <input
                    v-model="categoryForm.nameJa"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="カテゴリ名"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카테고리명 (중국어)</label
                  >
                  <input
                    v-model="categoryForm.nameZh"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="类别名称"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">정렬 순서</label>
                <input
                  v-model.number="categoryForm.sortOrder"
                  type="number"
                  class="w-full rounded-xl border border-slate-200 px-4 py-2.5 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="1"
                />
              </div>

              <!-- Icon/Image Selection -->
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">아이콘 / 이미지</label>

                <!-- Tab Selection -->
                <div class="mb-3 flex gap-2">
                  <button
                    class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    :class="
                      categoryForm.iconType === 'preset'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    "
                    @click="categoryForm.iconType = 'preset'"
                  >
                    프리셋 아이콘
                  </button>
                  <button
                    class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    :class="
                      categoryForm.iconType === 'image'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    "
                    @click="categoryForm.iconType = 'image'"
                  >
                    이미지 업로드
                  </button>
                </div>

                <!-- Preset Icons -->
                <div v-if="categoryForm.iconType === 'preset'" class="grid grid-cols-4 gap-2">
                  <button
                    v-for="preset in presetIcons"
                    :key="preset.id"
                    type="button"
                    class="flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all"
                    :class="
                      categoryForm.presetIcon === preset.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    "
                    @click="categoryForm.presetIcon = preset.id"
                  >
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-lg"
                      :class="getIconColors(preset.id).bg"
                    >
                      <!-- Render icon based on preset.id -->
                      <svg
                        v-if="preset.id === 'tag'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'coffee'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'drink'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'food'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'dessert'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'bread'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'ice'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'salad'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'pizza'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'burger'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'noodle'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                      <svg
                        v-else-if="preset.id === 'rice'"
                        class="h-5 w-5"
                        :class="getIconColors(preset.id).text"
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
                    </div>
                    <span class="text-xs text-slate-600">{{ preset.name }}</span>
                  </button>
                </div>

                <!-- Image Upload -->
                <div v-else>
                  <!-- Hidden file input -->
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="hidden"
                    @change="handleFileUpload"
                  />

                  <!-- Upload area -->
                  <div
                    v-if="!uploadPreview && !categoryForm.imageUrl"
                    class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-purple-400 hover:bg-purple-50"
                    @click="triggerFileInput"
                  >
                    <div
                      class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100"
                    >
                      <svg
                        class="h-6 w-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p class="text-sm font-medium text-slate-600">클릭하여 이미지 업로드</p>
                    <p class="mt-1 text-xs text-slate-400">JPG, PNG, GIF, WebP (최대 5MB)</p>
                  </div>

                  <!-- Uploading indicator -->
                  <div
                    v-else-if="isUploading"
                    class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8"
                  >
                    <div
                      class="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"
                    />
                    <p class="text-sm text-slate-600">업로드 중...</p>
                  </div>

                  <!-- Preview with uploaded image -->
                  <div v-else class="relative">
                    <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img
                        :src="uploadPreview || getImageSrc(categoryForm.imageUrl)"
                        alt="Preview"
                        class="h-40 w-full object-contain"
                        @error="
                          ($event.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22%3E%3Cpath stroke=%22%239ca3af%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z%22/%3E%3C/svg%3E'
                        "
                      />
                    </div>
                    <div class="mt-3 flex gap-2">
                      <button
                        type="button"
                        class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        @click="triggerFileInput"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        다른 이미지
                      </button>
                      <button
                        type="button"
                        class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                        @click="removeUploadedImage"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                class="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
                @click="showForm = false"
              >
                취소
              </button>
              <button
                class="rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-purple-700"
                @click="saveCategory"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
