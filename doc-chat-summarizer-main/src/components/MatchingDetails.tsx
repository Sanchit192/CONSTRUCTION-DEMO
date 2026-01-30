import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MatchingResult } from '@/types/invoice';
import { MatchingWorkflow } from './MatchingWorkflow';
import { AnomalyCard } from './AnomalyCard';
import { StatusBadge } from './StatusBadge';
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
}

export function MatchingDetails({ result, open, onOpenChange }: MatchingDetailsProps) {
  if (!result) return null;

  const allAnomalies = [
    ...result.step1Anomalies,
    ...result.step2Anomalies,
    ...result.step3Anomalies,
  ];

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
          {allAnomalies.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  Detected Anomalies ({allAnomalies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allAnomalies.map((anomaly) => (
                  <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Document Details Tabs */}
          <Tabs defaultValue="po" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="po">Purchase Order</TabsTrigger>
              <TabsTrigger value="receipt" disabled={!result.receipt}>
                Receipt
              </TabsTrigger>
              <TabsTrigger value="invoice" disabled={!result.invoice}>
                Invoice
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
            </TabsContent>

            <TabsContent value="receipt" className="mt-4">
              {result.receipt && (
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
              )}
            </TabsContent>

            <TabsContent value="invoice" className="mt-4">
              {result.invoice && (
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
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
