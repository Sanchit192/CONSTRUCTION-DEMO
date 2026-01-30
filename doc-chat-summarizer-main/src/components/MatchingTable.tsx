import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MatchingResult } from '@/types/invoice';
import { StatusBadge } from './StatusBadge';
import { Eye, AlertTriangle } from 'lucide-react';

interface MatchingTableProps {
  results: MatchingResult[];
  onViewDetails: (result: MatchingResult) => void;
}

export function MatchingTable({ results, onViewDetails }: MatchingTableProps) {
  const getTotalAnomalies = (result: MatchingResult) => {
    return result.step1Anomalies.length + result.step2Anomalies.length + result.step3Anomalies.length;
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">PO Number</TableHead>
            <TableHead className="font-semibold">Vendor</TableHead>
            <TableHead className="font-semibold">PO Amount</TableHead>
            <TableHead className="font-semibold">Receipt</TableHead>
            <TableHead className="font-semibold">Invoice</TableHead>
            <TableHead className="font-semibold">Anomalies</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const anomalyCount = getTotalAnomalies(result);
            return (
              <TableRow key={result.poNumber} className="hover:bg-muted/30">
                <TableCell className="font-medium font-mono">{result.poNumber}</TableCell>
                <TableCell>{result.purchaseOrder.vendor}</TableCell>
                <TableCell className="font-mono">
                  ${result.purchaseOrder.totalAmount.toLocaleString()}
                </TableCell>
                <TableCell>
                  {result.receipt ? (
                    <span className="text-sm font-mono">{result.receipt.receiptNumber}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {result.invoice ? (
                    <span className="text-sm font-mono">{result.invoice.invoiceNumber}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {anomalyCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{anomalyCount}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={result.overallStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(result)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
