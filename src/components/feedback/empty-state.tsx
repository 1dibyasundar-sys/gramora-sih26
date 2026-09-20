import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, RefreshCw, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl glass-panel border border-dashed border-surface-border',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center text-foreground/40 mb-4 shadow-subtle">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h4 className="text-h4 font-bold text-foreground mb-1.5">{title}</h4>
      <p className="text-body-sm text-foreground/60 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again or check your connection.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl glass-panel border border-rose-500/20 bg-rose-950/10',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3.5">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h4 className="text-h4 font-bold text-foreground mb-1">{title}</h4>
      <p className="text-body-sm text-foreground/60 max-w-sm mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
