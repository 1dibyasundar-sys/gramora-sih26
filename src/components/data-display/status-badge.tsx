import React from 'react';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

export interface StatusBadgeProps {
  status: OrderStatus | 'In Stock' | 'Low Stock' | 'Critical' | 'planned' | 'in_progress' | 'completed' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    switch (s) {
      // Order statuses
      case 'created':
        return { label: 'Consignment Created', color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' };
      case 'payment_pending':
        return { label: 'Payment Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse' };
      case 'escrow_funded':
        return { label: 'Escrow Secured', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'processing':
        return { label: 'Processing at Farm', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
      case 'dispatched':
        return { label: 'Dispatched', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' };
      case 'confirmed':
        return { label: 'Confirmed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'harvesting':
        return { label: 'Harvesting', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'packed':
        return { label: 'Packed & Graded', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'picked_up':
        return { label: 'Picked Up', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
      case 'in_transit':
        return { label: 'In Cold Transit', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 animate-pulse' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'delivered':
        return { label: 'Delivered', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'completed':
        return { label: 'Settled & Completed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };

      // Inventory
      case 'In Stock':
        return { label: 'In Stock', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'Low Stock':
        return { label: 'Low Stock', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'Critical':
        return { label: 'Critical Threshold', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };

      // Logistics
      case 'in_progress':
        return { label: 'Underway', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' };
      case 'planned':
        return { label: 'Scheduled', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
      case 'completed':
        return { label: 'Finished', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };

      default:
        return { label: s.replace('_', ' '), color: 'bg-surface-elevated text-foreground/70 border-surface-border' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        config.color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
