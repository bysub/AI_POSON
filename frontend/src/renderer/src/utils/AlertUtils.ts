import Swal from "sweetalert2";
import type { SweetAlertIcon, SweetAlertResult } from "sweetalert2";

// SweetAlert2 Toast Configuration
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export const showSuccessToast = (title: string): void => {
  Toast.fire({
    icon: "success",
    title: title,
  });
};

export const showErrorToast = (title: string): void => {
  Toast.fire({
    icon: "error",
    title: title,
  });
};

export const showInfoToast = (title: string): void => {
  Toast.fire({
    icon: "info",
    title: title,
  });
};

export const showWarningToast = (title: string): void => {
  Toast.fire({
    icon: "warning",
    title: title,
  });
};

export const showAlert = (
  title: string,
  text: string,
  icon: SweetAlertIcon = "success",
): Promise<SweetAlertResult> => {
  return Swal.fire({
    title: title,
    text: text,
    icon: icon,
    confirmButtonText: "확인",
    confirmButtonColor: "#3085d6",
  });
};

/**
 * 공통 확인 팝업
 * @param actionName - 버튼명 (승인, 반려, 상신, 삭제 등) - 메시지와 버튼 텍스트에 사용
 * @param icon - 아이콘 타입 ('promotion' | 'check' | 'close' | 'delete' | 'save' | 'folder')
 */
export const showConfirm = (
  actionName: string,
  icon: "promotion" | "check" | "close" | "delete" | "save" | "folder" = "promotion",
): Promise<SweetAlertResult> => {
  // 아이콘 SVG path 정의
  const iconPaths: Record<string, string> = {
    promotion:
      "m64 448 832-320-128 704-446.08-243.328L832 192 242.816 545.472 64 448zm256 512V657.024L512 768 320 960z",
    check:
      "M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm-55.808 536.384-99.52-99.584a38.4 38.4 0 1 0-54.336 54.336l126.72 126.72a38.272 38.272 0 0 0 54.336 0l262.4-262.464a38.4 38.4 0 1 0-54.272-54.336L456.192 600.384z",
    close:
      "M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 393.664L407.936 353.6a38.4 38.4 0 1 0-54.336 54.336L457.664 512 353.6 616.064a38.4 38.4 0 1 0 54.336 54.336L512 566.336 616.064 670.4a38.4 38.4 0 1 0 54.336-54.336L566.336 512 670.4 407.936a38.4 38.4 0 1 0-54.336-54.336L512 457.664z",
    delete:
      "M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z",
    save: "M893.3 293.3L730.7 130.7c-12-12-28.3-18.7-45.3-18.7H176c-35.3 0-64 28.7-64 64v672c0 35.3 28.7 64 64 64h672c35.3 0 64-28.7 64-64V338.6c0-17-6.7-33.3-18.7-45.3zM512 724c-70.7 0-128-57.3-128-128s57.3-128 128-128 128 57.3 128 128-57.3 128-128 128zm192-512v208H272V212h432z",
    folder:
      "M878.08 448H241.92l-96 384h636.16l96-384zM832 384v-64H485.12l-64-64H128v448l66.56-256H832z",
  };

  const path = iconPaths[icon] || iconPaths.promotion;

  // 삭제, 반려는 붉은색으로 표시
  const isDanger = icon === "delete" || icon === "close";
  const iconBgColor = isDanger ? "#dc2626" : "#2563eb";
  const confirmBtnColor = isDanger ? "#dc2626" : "#2563eb";

  const iconHtml = `
    <div class="confirm-icon-box" style="background-color: ${iconBgColor};">
      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path d="${path}"></path>
      </svg>
    </div>
  `;

  return Swal.fire({
    html: `
      <div class="confirm-content">
        ${iconHtml}
        <span class="confirm-text">${actionName} 하시겠습니까?</span>
      </div>
    `,
    showCancelButton: true,
    confirmButtonColor: confirmBtnColor,
    cancelButtonColor: "#6b7280",
    confirmButtonText: actionName,
    cancelButtonText: "취소",
    reverseButtons: false,
    showCloseButton: false,
    customClass: {
      popup: "custom-confirm-popup",
      confirmButton: "custom-confirm-btn",
      cancelButton: "custom-cancel-btn",
    },
  });
};

/**
 * API 에러에서 사용자 친화적 메시지 추출
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다",
): string {
  if (err instanceof Error) {
    const msg = err.message;
    // 백엔드가 보내는 한글 메시지가 있으면 그대로 사용
    if (msg && msg !== "API request failed" && !msg.startsWith("Request timeout")) {
      return msg;
    }
    if (msg === "Request timeout") return "서버 응답 시간이 초과되었습니다";
  }
  return fallback;
}

/**
 * API 에러를 Toast로 표시
 */
export function showApiError(err: unknown, fallback?: string): void {
  showErrorToast(getApiErrorMessage(err, fallback));
}

/**
 * API 에러를 Alert 팝업으로 표시
 */
export function showApiErrorAlert(
  err: unknown,
  title = "오류",
  fallback?: string,
): Promise<SweetAlertResult> {
  return showAlert(title, getApiErrorMessage(err, fallback), "error");
}

export default Toast;
