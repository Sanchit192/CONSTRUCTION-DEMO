import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchingResult, PurchaseOrder, Invoice } from '@/types/invoice';
import { MatchingWorkflow } from './MatchingWorkflow';
import { AnomalyCard } from './AnomalyCard';
import { StatusBadge } from './StatusBadge';
import { Pencil, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// const API_BASE = 'http://localhost:7071/api';

const API_BASE =
  "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

interface MatchingDetailsProps {
  result: MatchingResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
    onAnalyze: (result: MatchingResult, type: 'po' | 'receipt' | 'invoice') => void;
  onResultUpdate?: (result: MatchingResult) => void;
  isAnalyzing?: boolean;
  hasAnalyzed?: boolean;
}

export function MatchingDetails({ result, open, onOpenChange, onAnalyze, onResultUpdate, isAnalyzing = false, hasAnalyzed = false }: MatchingDetailsProps) {
  const [activeTab, setActiveTab] = useState<'po' | 'receipt' | 'invoice'>('po');
  const [editingPO, setEditingPO] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [editPOData, setEditPOData] = useState<PurchaseOrder | null>(null);
  const [editInvoiceData, setEditInvoiceData] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reset tab to 'po' when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('po');
    }
  }, [open]);

  const openPOEdit = () => {
    if (result?.purchaseOrder) {
      setEditPOData(JSON.parse(JSON.stringify(result.purchaseOrder)));
      setEditingPO(true);
    }
  };

  const openInvoiceEdit = () => {
    if (result?.invoice) {
      setEditInvoiceData(JSON.parse(JSON.stringify(result.invoice)));
      setEditingInvoice(true);
    }
  };

  const closePOEdit = () => {
    setEditingPO(false);
    setEditPOData(null);
  };

  const closeInvoiceEdit = () => {
    setEditingInvoice(false);
    setEditInvoiceData(null);
  };

  const savePOEdit = async () => {
    if (!editPOData || !result) return;

    const lineItemUpdates = editPOData.lineItems
      .filter((item) => item.id)
      .map(async (item) => {
        const response = await fetch(`${API_BASE}/po-line-item`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }),
        });

        const text = await response.text();
        return {
          id: item.id,
          ok: response.ok,
          status: response.status,
          body: text,
        };
      });

    if (lineItemUpdates.length === 0) {
      alert('No PO line items to update.');
      return;
    }

    setIsSaving(true);
    try {
      const responses = await Promise.all(lineItemUpdates);
      const failed = responses.find((resp) => !resp.ok);
      if (failed) {
        let details = failed.body;
        try {
          const parsed = JSON.parse(failed.body);
          details = parsed.error || parsed.details || failed.body;
        } catch {
          // use raw text
        }
        throw new Error(`Failed to save PO line items (${failed.status}): ${details}`);
      }

      const updatedPO: PurchaseOrder = {
        ...editPOData,
        totalAmount: editPOData.lineItems.reduce((sum, item) => sum + item.total, 0),
      };
      onResultUpdate?.({
        ...result,
        purchaseOrder: updatedPO,
      });

      alert('PO updated successfully');
      closePOEdit();
    } catch (error) {
      console.error('Error saving PO:', error);
      alert(`Failed to save PO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveInvoiceEdit = async () => {
    if (!editInvoiceData || !result) return;

    const lineItemUpdates = editInvoiceData.lineItems
      .filter((item) => item.id)
      .map(async (item) => {
        const response = await fetch(`${API_BASE}/invoice-line-item`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }),
        });

        const text = await response.text();
        return {
          id: item.id,
          ok: response.ok,
          status: response.status,
          body: text,
        };
      });

    if (lineItemUpdates.length === 0) {
      alert('No invoice line items to update.');
      return;
    }

    setIsSaving(true);
    try {
      const responses = await Promise.all(lineItemUpdates);
      const failed = responses.find((resp) => !resp.ok);
      if (failed) {
        let details = failed.body;
        try {
          const parsed = JSON.parse(failed.body);
          details = parsed.error || parsed.details || failed.body;
        } catch {
          // use raw text
        }
        throw new Error(`Failed to save invoice line items (${failed.status}): ${details}`);
      }

      const updatedInvoice: Invoice = {
        ...editInvoiceData,
        totalAmount: editInvoiceData.lineItems.reduce((sum, item) => sum + item.total, 0),
      };
      onResultUpdate?.({
        ...result,
        invoice: updatedInvoice,
      });

      alert('Invoice updated successfully');
      closeInvoiceEdit();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert(`Failed to save invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!result) return null;

  console.log('=== MATCHING DETAILS RENDER ===');
  console.log('activeTab:', activeTab);
  console.log('result.step1Anomalies:', result.step1Anomalies);
  console.log('result.step1Anomalies.length:', result.step1Anomalies?.length);

  const allAnomalies = [
    ...result.step1Anomalies,
    ...result.step2Anomalies,
    ...result.step3Anomalies,
  ];

  // Get anomalies based on active tab
  const currentAnomalies = activeTab === 'po' 
    ? result.step1Anomalies 
    : activeTab === 'receipt' 
    ? result.step2Anomalies 
    : result.step3Anomalies;

  console.log('currentAnomalies:', currentAnomalies);
  console.log('currentAnomalies.length:', currentAnomalies?.length);

  // Check if current tab has been analyzed
  const currentTabAnalyzed = activeTab === 'po' 
    ? hasAnalyzed 
    : activeTab === 'receipt' 
    ? result.receipt?.hasBeenAnalyzed 
    : result.invoice?.hasBeenAnalyzed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{result.poNumber} - Matching Details</DialogTitle>
            <StatusBadge status={result.overallStatus} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workflow visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3-Way Matching Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchingWorkflow result={result} />
            </CardContent>
          </Card>

          {/* Anomalies Section */}
          {isAnalyzing ? (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                  Analyzing anomalies...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ) : currentAnomalies.length > 0 ? (
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  Detected Anomalies ({currentAnomalies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentAnomalies.map((anomaly) => (
                  <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                ))}
              </CardContent>
            </Card>
          ) : currentTabAnalyzed ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-600 flex items-center gap-2">
                  ✓ No anomalies detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'po' 
                    ? 'All items in the Purchase Order match the SOW. No discrepancies found.'
                    : activeTab === 'receipt'
                    ? 'All items in the Receipt match the Purchase Order. No discrepancies found.'
                    : 'All items in the Invoice match the Receipt. No discrepancies found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === 'po' 
                    ? 'Click the Analyze button below to compare this Purchase Order against the final SOW report and detect any discrepancies.'
                    : activeTab === 'receipt'
                    ? 'Click the Analyze button below to compare this Receipt against the Purchase Order and detect any discrepancies.'
                    : 'Click the Analyze button below to detect any discrepancies.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Document Details Tabs */}
          <Tabs defaultValue="po" className="w-full" onValueChange={(value) => setActiveTab(value as 'po' | 'receipt' | 'invoice')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="po">
                Purchase Order
                {result.step1Anomalies.length > 0 && (
                  <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                    {result.step1Anomalies.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="receipt" disabled={!result.receipt && result.step1Anomalies.length > 0}>
                Receipt
                {result.step2Anomalies.length > 0 && (
                  <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                    {result.step2Anomalies.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="invoice" disabled={!result.invoice}>
                Invoice
                {result.step3Anomalies.length > 0 && (
                  <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                    {result.step3Anomalies.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="po" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{result.purchaseOrder.poNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.purchaseOrder.vendor}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Date: {result.purchaseOrder.date}</p>
                      <p>Expected: {result.purchaseOrder.expectedDelivery}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.purchaseOrder.lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.unitPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          ${result.purchaseOrder.totalAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={openPOEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onAnalyze(result, 'po')}
                  disabled={isAnalyzing}
                >
                  <Zap className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Purchase Order'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="receipt" className="mt-4">
              {result.receipt ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{result.receipt.receiptNumber}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.receipt.vendor}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Received: {result.receipt.receivedDate}</p>
                          <p>By: {result.receipt.receivedBy}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.receipt.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                              <TableCell className="text-right font-mono">
                                ${item.unitPrice.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${item.total.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell colSpan={3}>Total</TableCell>
                            <TableCell className="text-right font-mono">
                              ${result.receipt.totalAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        const orderId = result.purchaseOrder.OrderID || result.poNumber;
                        window.open(`/receipt?orderId=${encodeURIComponent(orderId)}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => onAnalyze(result, 'receipt')}
                      disabled={isAnalyzing}
                    >
                      <Zap className="h-4 w-4" />
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Receipt'}
                    </Button>
                  </div>
                </>
              ) : result.step1Anomalies.length === 0 ? (
                <>
                  <Card className="border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-muted-foreground">
                        No receipt found
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        No receipt has been created for this OrderID yet.
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end mt-4">
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const orderId = result.purchaseOrder.OrderID || result.poNumber;
                        window.open(`/receipt?orderId=${encodeURIComponent(orderId)}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Create Receipt
                    </Button>
                  </div>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="invoice" className="mt-4">
              {result.invoice && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{result.invoice.invoiceNumber}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.invoice.vendor}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Invoice Date: {result.invoice.invoiceDate}</p>
                          <p>Due: {result.invoice.dueDate}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.invoice.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                              <TableCell className="text-right font-mono">
                                ${item.unitPrice.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${item.total.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell colSpan={3}>Total</TableCell>
                            <TableCell className="text-right font-mono">
                              ${result.invoice.totalAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
              <div className="flex justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={openInvoiceEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onAnalyze(result, 'invoice')}
                  disabled={isAnalyzing}
                >
                  <Zap className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Invoice'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* PO Edit Modal */}
        {editingPO && editPOData && (
          <Dialog open={editingPO} onOpenChange={setEditingPO}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Purchase Order</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="po-number">PO Number</Label>
                    <Input
                      id="po-number"
                      value={editPOData.poNumber}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="po-vendor">Vendor</Label>
                    <Input
                      id="po-vendor"
                      value={editPOData.vendor}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="po-date">Date</Label>
                    <Input
                      id="po-date"
                      type="date"
                      value={editPOData.date}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="po-delivery">Expected Delivery</Label>
                    <Input
                      id="po-delivery"
                      type="date"
                      value={editPOData.expectedDelivery}
                      disabled
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-base font-semibold mb-3 block">Line Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editPOData.lineItems.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...editPOData.lineItems];
                                newItems[idx].description = e.target.value;
                                setEditPOData({ ...editPOData, lineItems: newItems });
                              }}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...editPOData.lineItems];
                                newItems[idx].quantity = parseInt(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setEditPOData({ ...editPOData, lineItems: newItems });
                              }}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...editPOData.lineItems];
                                newItems[idx].unitPrice = parseInt(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setEditPOData({ ...editPOData, lineItems: newItems });
                              }}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          ${editPOData.lineItems
                            .reduce((sum, item) => sum + item.total, 0)
                            .toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closePOEdit}>
                    Cancel
                  </Button>
                  <Button onClick={savePOEdit} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Invoice Edit Modal */}
        {editingInvoice && editInvoiceData && (
          <Dialog open={editingInvoice} onOpenChange={setEditingInvoice}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Invoice</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inv-number">Invoice Number</Label>
                    <Input
                      id="inv-number"
                      value={editInvoiceData.invoiceNumber}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-vendor">Vendor</Label>
                    <Input
                      id="inv-vendor"
                      value={editInvoiceData.vendor}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-date">Invoice Date</Label>
                    <Input
                      id="inv-date"
                      type="date"
                      value={editInvoiceData.invoiceDate}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-due">Due Date</Label>
                    <Input
                      id="inv-due"
                      type="date"
                      value={editInvoiceData.dueDate}
                      disabled
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-base font-semibold mb-3 block">Line Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editInvoiceData.lineItems.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...editInvoiceData.lineItems];
                                newItems[idx].description = e.target.value;
                                setEditInvoiceData({ ...editInvoiceData, lineItems: newItems });
                              }}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...editInvoiceData.lineItems];
                                newItems[idx].quantity = parseInt(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setEditInvoiceData({ ...editInvoiceData, lineItems: newItems });
                              }}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...editInvoiceData.lineItems];
                                newItems[idx].unitPrice = parseInt(e.target.value) || 0;
                                newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
                                setEditInvoiceData({ ...editInvoiceData, lineItems: newItems });
                              }}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          ${editInvoiceData.lineItems
                            .reduce((sum, item) => sum + item.total, 0)
                            .toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeInvoiceEdit}>
                    Cancel
                  </Button>
                  <Button onClick={saveInvoiceEdit} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}      </DialogContent>
    </Dialog>
  );
}