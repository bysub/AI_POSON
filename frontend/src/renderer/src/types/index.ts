// Product types
export interface Product {
  id: number;
  barcode: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  sellPrice: number;
  categoryId: number;
  imageUrl?: string;
  description?: string;
  stock: number;
  isActive: boolean;
  options?: ProductOption[];
}

export interface ProductOption {
  id: number;
  name: string;
  price: number;
  isRequired: boolean;
}

// Category types
export interface Category {
  id: number;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

// Cart types
export interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  options?: Record<string, unknown>;
  imageUrl?: string;
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  kioskId?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentType?: PaymentType;
  status: OrderStatus;
  memo?: string;
  createdAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  options?: Record<string, unknown>;
}

export type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "COMPLETED" | "CANCELLED";
export type PaymentType = "CARD" | "CASH" | "MIXED";

// Member types
export interface Member {
  id: number;
  code: string;
  name: string;
  phone: string;
  points: number;
  grade: MemberGrade;
}

export type MemberGrade = "NORMAL" | "SILVER" | "GOLD" | "VIP";

// Payment types
export interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentType: PaymentType;
  cardData?: CardPaymentData;
  cashData?: CashPaymentData;
}

export interface CardPaymentData {
  vanCode: string;
  installmentMonths: number;
}

export interface CashPaymentData {
  receivedAmount: number;
  phoneNumber?: string; // for cash receipt
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  approvalNumber?: string;
  changeAmount?: number;
  errorCode?: string;
  errorMessage?: string;
}
