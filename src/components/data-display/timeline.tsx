import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, MapPin } from 'lucide-react';
import { OrderTimelineStep } from '@/types';

export interface TimelineProps {
  steps: OrderTimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('relative space-y-6', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="relative flex items-start gap-4 group">
            {/* Connecting vertical line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[17px] top-8 w-0.5 h-[calc(100%-12px)] transition-colors',
                  step.completed ? 'bg-primary-500/60' : 'bg-surface-border'
                )}
              />
            )}

            {/* Node Icon */}
            <div
              className={cn(
                'relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all',
                step.current
                  ? 'bg-primary-600 text-white border-primary-400 ring-4 ring-primary-500/20'
                  : step.completed
                  ? 'bg-primary-950 text-primary-400 border-primary-500/40'
                  : 'bg-surface-elevated text-foreground/30 border-surface-border'
              )}
            >
              {step.completed ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className={cn(
                    'text-body-sm font-bold',
                    step.current
                      ? 'text-primary-300'
                      : step.completed
                      ? 'text-foreground'
                      : 'text-foreground/50'
                  )}
                >
                  {step.title}
                </h4>
                <span className="text-caption font-mono text-foreground/40">{step.timestamp}</span>
              </div>
              <p className="text-body-sm text-foreground/70 mt-1 leading-relaxed">
                {step.description}
              </p>
              {step.location && (
                <div className="flex items-center gap-1.5 mt-2 text-caption text-foreground/50">
                  <MapPin className="w-3.5 h-3.5 text-primary-400" />
                  <span>{step.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
