import { useState, useEffect } from 'react';
import { Receipt, ReceiptStatus, LineItem } from '@/types/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileText, Save, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// const API_BASE = "http://localhost:7071/api";
const API_BASE =
  "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

// Types
interface LineItemsTableProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

interface StatusBadgeProps {
  status: ReceiptStatus;
}

// Status Badge Component
const statusLabels: Record<ReceiptStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'status-badge',
        status === 'draft' && 'status-draft',
        status === 'approved' && 'status-paid',
        status === 'rejected' && 'status-cancelled'
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

// Line Items Table Component
function LineItemsTable({ items, onChange, readOnly = false }: LineItemsTableProps) {
  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    });
    onChange(updatedItems);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-24">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-32">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-32">
                Total
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-16">
                  
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 4 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No line items added yet
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-sm">{item.description}</span>
                    ) : (
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className="border-0 bg-transparent px-0 focus-visible:ring-0"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="block text-right text-sm">{item.quantity}</span>
                    ) : (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="border-0 bg-transparent px-0 text-right focus-visible:ring-0"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="block text-right text-sm">
                        ${item.unitPrice.toFixed(2)}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="border-0 bg-transparent px-0 text-right focus-visible:ring-0"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    ${item.total.toFixed(2)}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-muted/50">
            <tr>
              <td colSpan={readOnly ? 3 : 4} className="px-4 py-3 text-right text-sm font-medium">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold">
                ${subtotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <Button variant="outline" onClick={addItem} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Line Item
        </Button>
      )}
    </div>
  );
}

// Main Receipt Management Component
export function ReceiptManagement() {
  const [searchOrderId, setSearchOrderId] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isNewReceipt, setIsNewReceipt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('Unknown User');

  // Get logged-in user from localStorage
  useEffect(() => {
    try {
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        const user = JSON.parse(userSession);
        setCurrentUser(user.name || 'Unknown User');
      }
    } catch (error) {
      console.error('Failed to get user session:', error);
    }
  }, []);

  // Generate numeric receipt ID with RCPT- prefix
  const generateNumericReceiptId = (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const numericId = `${timestamp}${random}`.slice(-10); // Last 10 digits for a shorter ID
    return `RCPT-${numericId}`;
  };

  const handleSearch = async () => {
    const trimmedOrderId = searchOrderId.trim();
    if (!trimmedOrderId) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/receipts?orderId=${encodeURIComponent(trimmedOrderId)}`
      );

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const payload = await res.json();
      const apiReceipt = payload?.data?.[0];

      if (apiReceipt) {
        // Map API line items to frontend format
        const mappedLineItems: LineItem[] = (apiReceipt.lineItems || []).map((item: any) => ({
          id: item.item_id || crypto.randomUUID(),
          description: item.item_name || '',
          quantity: item.quantity || 0,
          unitPrice: item.unit_price || 0,
          total: item.total_price || 0,
        }));

        const mappedReceipt: Receipt = {
          receiptId: apiReceipt.receiptId,
          orderId: apiReceipt.orderId,
          status: apiReceipt.status as ReceiptStatus,
          createdBy: apiReceipt.createdBy,
          lineItems: mappedLineItems,
          createdAt: new Date(apiReceipt.createdAt),
          updatedAt: new Date(apiReceipt.updatedAt),
        };

        setReceipt(mappedReceipt);
        setIsNewReceipt(false);
      } else {
        // Create new receipt
        setReceipt({
          receiptId: generateNumericReceiptId(),
          orderId: trimmedOrderId.toUpperCase(),
          status: 'draft',
          createdBy: currentUser,
          lineItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setIsNewReceipt(true);
      }
    } catch (error) {
      console.error('Failed to fetch receipt:', error);
      alert('Failed to fetch receipt from server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (status: ReceiptStatus) => {
    if (receipt) {
      setReceipt({ ...receipt, status, updatedAt: new Date() });
    }
  };

  const handleLineItemsChange = (lineItems: LineItem[]) => {
    if (receipt) {
      setReceipt({ ...receipt, lineItems, updatedAt: new Date() });
    }
  };

  const handleSave = async () => {
    if (!receipt) return;

    try {
      // Map frontend line items to backend format
      const mappedLineItems = receipt.lineItems.map((item) => ({
        item_id: item.id,
        item_name: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total,
      }));

      // Prepare payload
      const payload = {
        receiptId: receipt.receiptId,
        orderId: receipt.orderId,
        status: receipt.status,
        createdBy: receipt.createdBy,
        lineItems: mappedLineItems,
      };

      // Send POST request
      const response = await fetch(`${API_BASE}/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save receipt: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setIsNewReceipt(false);
        alert('Receipt saved successfully!');
        // Reset form
        setReceipt(null);
        setSearchOrderId('');
      } else {
        alert('Failed to save receipt: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save receipt:', error);
      alert('Error saving receipt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="card-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Find or Create Receipt</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="orderId" className="sr-only">
              Order ID
            </Label>
            <Input
              id="orderId"
              placeholder="Enter Order ID (e.g., ORD-001)"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-11"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading} className="h-11 px-6">
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Try searching for ORD-001 or ORD-002 to see existing receipts
        </p>
      </div>

      {/* Receipt Details */}
      {receipt && (
        <div className="card-elevated overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {isNewReceipt ? 'New Receipt' : 'Receipt Details'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{receipt.receiptId}</p>
                </div>
              </div>
              <StatusBadge status={receipt.status} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Receipt ID */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Receipt ID</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium">
                  {receipt.receiptId}
                </div>
              </div>

              {/* Order ID */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Order ID</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium">
                  {receipt.orderId}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <Select value={receipt.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {isNewReceipt ? 'Created' : 'Last Updated'}
                </Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm">
                  {receipt.updatedAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Created By */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Created By</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium">
                  {receipt.createdBy || 'N/A'}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mt-8">
              <Label className="mb-3 block text-muted-foreground">Line Items</Label>
              <LineItemsTable
                items={receipt.lineItems}
                onChange={handleLineItemsChange}
              />
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setReceipt(null);
                  setSearchOrderId('');
                }}
              >
                Clear
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {isNewReceipt ? 'Create Receipt' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
