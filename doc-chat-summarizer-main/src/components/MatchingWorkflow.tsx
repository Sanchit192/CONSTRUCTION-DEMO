import { Card, CardContent } from '@/components/ui/card';
import { MatchingResult } from '@/types/invoice';
import { FileText, Package, Receipt, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchingWorkflowProps {
  result: MatchingResult;
}

export function MatchingWorkflow({ result }: MatchingWorkflowProps) {
  const hasStep1Anomaly = result.step1Anomalies.length > 0;
  const hasStep2Anomaly = result.step2Anomalies.length > 0;
  const hasStep3Anomaly = result.step3Anomalies.length > 0;

  const steps = [
    {
      label: 'Purchase Order',
      icon: FileText,
      status: 'complete' as const,
      value: result.purchaseOrder.poNumber,
    },
    {
      label: 'Step 1: Match',
      isStep: true,
      hasAnomaly: hasStep1Anomaly,
      anomalyCount: result.step1Anomalies.length,
    },
    {
      label: 'Receipt',
      icon: Package,
      status: result.receipt ? (hasStep1Anomaly ? 'anomaly' : 'complete') : 'pending',
      value: result.receipt?.receiptNumber || 'Awaiting',
    },
    {
      label: 'Step 2: Match',
      isStep: true,
      hasAnomaly: hasStep2Anomaly,
      anomalyCount: result.step2Anomalies.length,
    },
    {
      label: 'Invoice',
      icon: Receipt,
      status: result.invoice ? (hasStep2Anomaly || hasStep3Anomaly ? 'anomaly' : 'complete') : 'pending',
      value: result.invoice?.invoiceNumber || 'Awaiting',
    },
  ];

  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          {step.isStep ? (
            <div className="flex flex-col items-center px-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  step.hasAnomaly
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
                )}
              >
                {step.hasAnomaly ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>
              {step.hasAnomaly && (
                <span className="text-xs text-destructive mt-1 font-medium">
                  {step.anomalyCount} issue{step.anomalyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          ) : (
            <Card
              className={cn(
                'border-2 transition-all',
                step.status === 'complete' && 'border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/5',
                step.status === 'pending' && 'border-border bg-muted/30',
                step.status === 'anomaly' && 'border-destructive/50 bg-destructive/5'
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    step.status === 'complete' && 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]',
                    step.status === 'pending' && 'bg-muted text-muted-foreground',
                    step.status === 'anomaly' && 'bg-destructive/20 text-destructive'
                  )}
                >
                  {step.icon && <step.icon className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                  <p className="font-medium text-sm">{step.value}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {index < steps.length - 1 && !step.isStep && !steps[index + 1]?.isStep && (
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
