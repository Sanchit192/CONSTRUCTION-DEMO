import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'complete' | 'partial' | 'pending' | 'anomaly' | 'matched' | 'received';
  className?: string;
}

const statusConfig = {
  complete: {
    label: 'Complete',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]',
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]',
  },
  partial: {
    label: 'Partial',
    icon: Clock,
    className: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]',
  },
  received: {
    label: 'Received',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] hover:bg-[hsl(var(--info))]',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-muted text-muted-foreground hover:bg-muted',
  },
  anomaly: {
    label: 'Anomaly',
    icon: AlertTriangle,
    className: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('gap-1.5 font-medium', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
