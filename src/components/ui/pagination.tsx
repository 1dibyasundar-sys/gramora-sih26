import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn('flex items-center justify-center space-x-1.5', className)}
    >
      <IconButton
        variant="secondary"
        size="sm"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </IconButton>

      <div className="flex items-center space-x-1">
        {pages.map((page) => {
          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'w-8 h-8 rounded-md text-caption font-semibold flex items-center justify-center transition-colors',
                isCurrent
                  ? 'bg-primary-600 text-white'
                  : 'text-foreground/70 hover:text-foreground hover:bg-surface-elevated'
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      <IconButton
        variant="secondary"
        size="sm"
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </IconButton>
    </nav>
  );
}
