// Product types
export type ProductStatus = "SELLING" | "SOLD_OUT" | "PENDING" | "HIDDEN";
export type TaxType = "TAXABLE" | "TAX_FREE" | "ZERO_RATE";

export interface Product {
  id: number;
  barcode: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  sellPrice: number;
  costPrice?: number;
  taxType?: TaxType;
  categoryId: number;
  supplierId?: number;
  imageUrl?: string;
  description?: string;
  status: ProductStatus;
  isActive: boolean;
  options?: ProductOption[];
  category?: { id: number; name: string };
  supplier?: { id: number; code: string; name: string; type: string };
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

// Supplier types
export type SupplierType = "FOOD" | "BEVERAGE" | "SUPPLIES" | "PACKAGING" | "ETC";

export interface Supplier {
  id: number;
  code: string;
  name: string;
  type: SupplierType;
  businessNumber?: string;
  businessType?: string;
  businessItem?: string;
  representative?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  addressDetail?: string;
  discountRate: number;
  paymentTerms?: string;
  memo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

// Purchase types
export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PurchaseItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  sellPrice: number;
  amount: number;
  product?: {
    id: number;
    barcode: string;
    name: string;
    sellPrice: number;
    costPrice?: number;
  };
}

export interface Purchase {
  id: number;
  purchaseCode: string;
  supplierId: number;
  purchaseDate: string;
  totalAmount: number;
  taxAmount: number;
  taxIncluded: boolean;
  status: PurchaseStatus;
  memo?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: number;
    code: string;
    name: string;
    type: SupplierType;
  };
  items?: PurchaseItem[];
  _count?: { items: number };
}

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
