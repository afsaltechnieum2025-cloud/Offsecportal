import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function YellowAccentBlock({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-400/10 p-4 overflow-hidden',
        className,
      )}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-yellow-400 to-orange-500" />
      <div className={cn('pl-3', contentClassName)}>{children}</div>
    </div>
  );
}

export function OrangeAccentBlock({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-orange-400/10 p-4 overflow-hidden',
        className,
      )}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-orange-500 to-yellow-400" />
      <div className={cn('pl-3', contentClassName)}>{children}</div>
    </div>
  );
}

export function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      {children}
    </p>
  );
}
