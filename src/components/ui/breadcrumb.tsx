import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-body-sm', className)}>
      <ol className="flex items-center space-x-2">
        {showHome && (
          <li className="flex items-center">
            <Link
              href="/"
              className="text-foreground/50 hover:text-foreground transition-colors inline-flex items-center"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-foreground/60 hover:text-foreground transition-colors font-medium text-caption sm:text-body-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-foreground font-semibold text-caption sm:text-body-sm truncate max-w-[200px]"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
