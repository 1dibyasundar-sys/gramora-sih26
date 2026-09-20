import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  onClose,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    info: 'bg-sky-950/30 border-sky-500/30 text-sky-200',
    success: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-950/30 border-amber-500/30 text-amber-200',
    error: 'bg-rose-950/30 border-rose-500/30 text-rose-200',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3.5 p-4 rounded-xl border backdrop-blur-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 text-body-sm leading-relaxed">
        {title && <h5 className="font-semibold mb-0.5 text-foreground">{title}</h5>}
        <div className="text-foreground/80">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close alert"
          className="text-foreground/40 hover:text-foreground p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
