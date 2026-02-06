import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchingResult } from '@/types/invoice';
import { MatchingWorkflow } from './MatchingWorkflow';
import { AnomalyCard } from './AnomalyCard';
import { StatusBadge } from './StatusBadge';
import { Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MatchingDetailsProps {
  result: MatchingResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
    onAnalyze: (result: MatchingResult, type: 'po' | 'receipt' | 'invoice') => void;
  isAnalyzing?: boolean;
  hasAnalyzed?: boolean;
}

export function MatchingDetails({ result, open, onOpenChange, onAnalyze, isAnalyzing = false, hasAnalyzed = false }: MatchingDetailsProps) {
  const [activeTab, setActiveTab] = useState<'po' | 'receipt' | 'invoice'>('po');
  
  // Reset tab to 'po' when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('po');
    }
  }, [open]);
  
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
    : result.invoice?.status === 'To be Paid' || result.invoice?.status === 'pending';

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
              <TabsTrigger value="receipt" disabled={!result.receipt}>
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

              <div className="flex justify-end mt-4">
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
              {result.receipt && (
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
                </>
              )}
              <div className="flex justify-end mt-4">
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
              <div className="flex justify-end mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
