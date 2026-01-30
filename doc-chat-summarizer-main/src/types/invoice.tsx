export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  date: string;
  expectedDelivery: string;
  lineItems: LineItem[];
  totalAmount: number;
  status: 'pending' | 'received' | 'matched' | 'anomaly';
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  poNumber: string;
  vendor: string;
  receivedDate: string;
  receivedBy: string;
  lineItems: LineItem[];
  totalAmount: number;
  status: 'pending' | 'matched' | 'anomaly';
  anomalies?: Anomaly[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: LineItem[];
  totalAmount: number;
  status: 'pending' | 'matched' | 'anomaly';
  anomalies?: Anomaly[];
}

export interface Anomaly {
  id: string;
  type: 'quantity_mismatch' | 'price_mismatch' | 'total_mismatch' | 'missing_item' | 'extra_item' | 'date_issue';
  severity: 'low' | 'medium' | 'high';
  description: string;
  field: string;
  expectedValue: string | number;
  actualValue: string | number;
  step: 'po_receipt' | 'receipt_invoice' | 'po_invoice';
}

export interface MatchingResult {
  poNumber: string;
  purchaseOrder: PurchaseOrder;
  receipt?: Receipt;
  invoice?: Invoice;
  step1Anomalies: Anomaly[]; // PO vs Receipt
  step2Anomalies: Anomaly[]; // Receipt vs Invoice
  step3Anomalies: Anomaly[]; // PO vs Invoice (final verification)
  overallStatus: 'complete' | 'partial' | 'pending' | 'anomaly';
}
