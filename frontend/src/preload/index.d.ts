import { ElectronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      // App
      getVersion: () => Promise<string>;
      quit: () => Promise<void>;
      toggleDevTools: () => Promise<void>;

      // Environment
      getEnv: (key: string) => Promise<string>;

      // Printer
      printer: {
        connect: () => Promise<boolean>;
        disconnect: () => Promise<void>;
        printReceipt: (data: ReceiptData) => Promise<PrintResult>;
        printKitchenOrder: (data: KitchenOrderData) => Promise<PrintResult>;
        openCashDrawer: () => Promise<boolean>;
        getStatus: () => Promise<PrinterStatus>;
      };

      // Scanner
      scanner: {
        connect: () => Promise<boolean>;
        disconnect: () => Promise<void>;
        getStatus: () => Promise<ScannerStatus>;
        onScan: (callback: (barcode: string) => void) => void;
        removeScanListener: () => void;
      };

      // Payment Terminal
      terminal: {
        connect: () => Promise<boolean>;
        disconnect: () => Promise<void>;
        requestPayment: (data: PaymentTerminalRequest) => Promise<PaymentTerminalResult>;
        cancelPayment: (transactionId: string) => Promise<PaymentTerminalResult>;
        getStatus: () => Promise<TerminalStatus>;
      };

      // Hardware Manager
      hardware: {
        getStatus: () => Promise<HardwareStatus>;
        connectAll: () => Promise<{ printer: boolean; scanner: boolean; terminal: boolean }>;
        disconnectAll: () => Promise<void>;
      };

      // Speech Recognition (Whisper Daemon)
      stt: {
        recognize: (lang: string, timeoutSec: number, vocabulary?: string[]) => Promise<STTResult>;
        stop: () => Promise<void>;
        isAvailable: () => Promise<{
          available: boolean;
          ready: boolean;
          error?: string | null;
          python?: string | null;
        }>;
        setModel: (model: string) => Promise<{ success: boolean; model?: string; error?: string }>;
      };
    };
  }
}

// Receipt Data
interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  businessNumber?: string;
  orderNumber: string;
  orderDate: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cardInfo?: {
    cardName: string;
    approvalNumber: string;
    installmentMonths?: number;
  };
  cashInfo?: {
    receivedAmount: number;
    changeAmount: number;
  };
  footer?: string;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
}

// Kitchen Order Data
interface KitchenOrderData {
  orderNumber: string;
  orderDate: Date;
  tableNumber?: string;
  items: KitchenOrderItem[];
  notes?: string;
}

interface KitchenOrderItem {
  name: string;
  quantity: number;
  options?: string[];
  notes?: string;
}

// Print Result
interface PrintResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// Printer Status
interface PrinterStatus {
  connected: boolean;
  paperStatus: "ok" | "low" | "empty" | "unknown";
  coverOpen: boolean;
  error?: string;
}

// Scanner Status
interface ScannerStatus {
  connected: boolean;
  error?: string;
}

// Payment Terminal Request
interface PaymentTerminalRequest {
  amount: number;
  orderId: string;
  installmentMonths?: number;
}

// Payment Terminal Result
interface PaymentTerminalResult {
  success: boolean;
  transactionId?: string;
  approvalNumber?: string;
  cardName?: string;
  cardNumber?: string;
  installmentMonths?: number;
  errorCode?: string;
  errorMessage?: string;
}

// Terminal Status
interface TerminalStatus {
  connected: boolean;
  terminalId?: string;
  vanCode?: string;
  error?: string;
}

// STT Result
interface STTResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: string;
}

// Hardware Status
interface HardwareStatus {
  printer: { connected: boolean };
  scanner: { connected: boolean };
  terminal: { connected: boolean };
}
