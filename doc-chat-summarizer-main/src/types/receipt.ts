export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type ReceiptStatus = 'draft' | 'approved' | 'rejected';

export interface Receipt {
  receiptId: string;
  orderId: string;
  status: ReceiptStatus;
  createdBy: string;
  lineItems: LineItem[];
  createdAt: Date;
  updatedAt: Date;
}
