import { PurchaseOrder, Receipt, Invoice, MatchingResult, Anomaly } from '@/types/invoice';

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    vendor: 'Tech Supplies Inc.',
    date: '2024-01-15',
    expectedDelivery: '2024-01-22',
    lineItems: [
      { id: '1a', description: 'Laptop Computer', quantity: 10, unitPrice: 1200, total: 12000 },
      { id: '1b', description: 'USB-C Docking Station', quantity: 10, unitPrice: 150, total: 1500 },
      { id: '1c', description: 'Wireless Mouse', quantity: 20, unitPrice: 35, total: 700 },
    ],
    totalAmount: 14200,
    status: 'matched',
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    vendor: 'Office Essentials Co.',
    date: '2024-01-18',
    expectedDelivery: '2024-01-25',
    lineItems: [
      { id: '2a', description: 'Office Chairs (Ergonomic)', quantity: 25, unitPrice: 450, total: 11250 },
      { id: '2b', description: 'Standing Desk', quantity: 15, unitPrice: 800, total: 12000 },
    ],
    totalAmount: 23250,
    status: 'anomaly',
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    vendor: 'Cloud Services Ltd.',
    date: '2024-01-20',
    expectedDelivery: '2024-01-27',
    lineItems: [
      { id: '3a', description: 'Annual Cloud License', quantity: 100, unitPrice: 120, total: 12000 },
      { id: '3b', description: 'Support Package', quantity: 1, unitPrice: 5000, total: 5000 },
    ],
    totalAmount: 17000,
    status: 'pending',
  },
  {
    id: '4',
    poNumber: 'PO-2024-004',
    vendor: 'Hardware Direct',
    date: '2024-01-22',
    expectedDelivery: '2024-01-29',
    lineItems: [
      { id: '4a', description: 'Server Rack', quantity: 2, unitPrice: 3500, total: 7000 },
      { id: '4b', description: 'Network Switch', quantity: 4, unitPrice: 890, total: 3560 },
      { id: '4c', description: 'CAT6 Cable Bundle', quantity: 10, unitPrice: 45, total: 450 },
    ],
    totalAmount: 11010,
    status: 'received',
  },
];

export const mockReceipts: Receipt[] = [
  {
    id: '1',
    receiptNumber: 'REC-2024-001',
    poNumber: 'PO-2024-001',
    vendor: 'Tech Supplies Inc.',
    receivedDate: '2024-01-21',
    receivedBy: 'John Smith',
    lineItems: [
      { id: '1a', description: 'Laptop Computer', quantity: 10, unitPrice: 1200, total: 12000 },
      { id: '1b', description: 'USB-C Docking Station', quantity: 10, unitPrice: 150, total: 1500 },
      { id: '1c', description: 'Wireless Mouse', quantity: 20, unitPrice: 35, total: 700 },
    ],
    totalAmount: 14200,
    status: 'matched',
  },
  {
    id: '2',
    receiptNumber: 'REC-2024-002',
    poNumber: 'PO-2024-002',
    vendor: 'Office Essentials Co.',
    receivedDate: '2024-01-26',
    receivedBy: 'Sarah Johnson',
    lineItems: [
      { id: '2a', description: 'Office Chairs (Ergonomic)', quantity: 23, unitPrice: 450, total: 10350 }, // Anomaly: quantity mismatch
      { id: '2b', description: 'Standing Desk', quantity: 15, unitPrice: 800, total: 12000 },
    ],
    totalAmount: 22350,
    status: 'anomaly',
    anomalies: [
      {
        id: 'a1',
        type: 'quantity_mismatch',
        severity: 'high',
        description: 'Quantity received does not match PO',
        field: 'Office Chairs quantity',
        expectedValue: 25,
        actualValue: 23,
        step: 'po_receipt',
      },
    ],
  },
  {
    id: '3',
    receiptNumber: 'REC-2024-004',
    poNumber: 'PO-2024-004',
    vendor: 'Hardware Direct',
    receivedDate: '2024-01-28',
    receivedBy: 'Mike Wilson',
    lineItems: [
      { id: '4a', description: 'Server Rack', quantity: 2, unitPrice: 3500, total: 7000 },
      { id: '4b', description: 'Network Switch', quantity: 4, unitPrice: 890, total: 3560 },
      { id: '4c', description: 'CAT6 Cable Bundle', quantity: 10, unitPrice: 45, total: 450 },
    ],
    totalAmount: 11010,
    status: 'matched',
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-0156',
    poNumber: 'PO-2024-001',
    vendor: 'Tech Supplies Inc.',
    invoiceDate: '2024-01-22',
    dueDate: '2024-02-22',
    lineItems: [
      { id: '1a', description: 'Laptop Computer', quantity: 10, unitPrice: 1200, total: 12000 },
      { id: '1b', description: 'USB-C Docking Station', quantity: 10, unitPrice: 150, total: 1500 },
      { id: '1c', description: 'Wireless Mouse', quantity: 20, unitPrice: 35, total: 700 },
    ],
    totalAmount: 14200,
    status: 'matched',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-0892',
    poNumber: 'PO-2024-002',
    vendor: 'Office Essentials Co.',
    invoiceDate: '2024-01-27',
    dueDate: '2024-02-27',
    lineItems: [
      { id: '2a', description: 'Office Chairs (Ergonomic)', quantity: 25, unitPrice: 475, total: 11875 }, // Price mismatch
      { id: '2b', description: 'Standing Desk', quantity: 15, unitPrice: 800, total: 12000 },
    ],
    totalAmount: 23875,
    status: 'anomaly',
    anomalies: [
      {
        id: 'a2',
        type: 'price_mismatch',
        severity: 'medium',
        description: 'Unit price on invoice differs from PO',
        field: 'Office Chairs unit price',
        expectedValue: 450,
        actualValue: 475,
        step: 'receipt_invoice',
      },
      {
        id: 'a3',
        type: 'total_mismatch',
        severity: 'high',
        description: 'Invoice total does not match expected amount',
        field: 'Total Amount',
        expectedValue: 23250,
        actualValue: 23875,
        step: 'po_invoice',
      },
    ],
  },
];

export const getMatchingResults = (): MatchingResult[] => {
  return mockPurchaseOrders.map((po) => {
    const receipt = mockReceipts.find((r) => r.poNumber === po.poNumber);
    const invoice = mockInvoices.find((i) => i.poNumber === po.poNumber);

    const step1Anomalies: Anomaly[] = receipt?.anomalies?.filter((a) => a.step === 'po_receipt') || [];
    const step2Anomalies: Anomaly[] = invoice?.anomalies?.filter((a) => a.step === 'receipt_invoice') || [];
    const step3Anomalies: Anomaly[] = invoice?.anomalies?.filter((a) => a.step === 'po_invoice') || [];

    let overallStatus: MatchingResult['overallStatus'] = 'pending';
    if (receipt && invoice) {
      if (step1Anomalies.length === 0 && step2Anomalies.length === 0 && step3Anomalies.length === 0) {
        overallStatus = 'complete';
      } else {
        overallStatus = 'anomaly';
      }
    } else if (receipt || invoice) {
      overallStatus = 'partial';
    }

    return {
      poNumber: po.poNumber,
      purchaseOrder: po,
      receipt,
      invoice,
      step1Anomalies,
      step2Anomalies,
      step3Anomalies,
      overallStatus,
    };
  });
};
