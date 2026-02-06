import { Card, CardContent } from '@/components/ui/card';
import { Anomaly } from '@/types/invoice';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnomalyCardProps {
  anomaly: Anomaly;
}

const severityConfig = {
  high: {
    icon: AlertTriangle,
    bgClass: 'bg-destructive/10 border-destructive/30',
    iconClass: 'text-destructive',
    label: 'High Severity',
  },
  medium: {
    icon: AlertCircle,
    bgClass: 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30',
    iconClass: 'text-[hsl(var(--warning))]',
    label: 'Medium Severity',
  },
  low: {
    icon: Info,
    bgClass: 'bg-[hsl(var(--info))]/10 border-[hsl(var(--info))]/30',
    iconClass: 'text-[hsl(var(--info))]',
    label: 'Low Severity',
  },
};

const stepLabels = {
  po_receipt: 'Step 1: PO ↔ SOW',
  receipt_invoice: 'Step 2: Receipt ↔ PO',
  po_invoice: 'Step 3: Invoice ↔ Receipt',
};

export function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const config = severityConfig[anomaly.severity];
  const Icon = config.icon;

  // Check if the field is related to pricing/money
  const isPriceField = ['unitPrice', 'price', 'total', 'amount', 'unitprice', 'totalprice'].includes(
    anomaly.field.toLowerCase().replace(/[_\s]/g, '')
  );

  // Format value with $ for price fields
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      const formatted = value.toLocaleString();
      return isPriceField ? `$${formatted}` : formatted;
    }
    return value;
  };

  return (
    <Card className={cn('border', config.bgClass)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-card', config.iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded', config.bgClass)}>
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {stepLabels[anomaly.step]}
              </span>
            </div>
            <p className="font-medium text-foreground mb-1">{anomaly.description}</p>
            <p className="text-sm text-muted-foreground">{anomaly.field}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Expected: </span>
                <span className="font-mono font-medium text-[hsl(var(--success))]">
                  {formatValue(anomaly.expectedValue)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Actual: </span>
                <span className="font-mono font-medium text-destructive">
                  {formatValue(anomaly.actualValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
