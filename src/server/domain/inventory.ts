import { z } from 'zod';
import { Identifiable } from '../repositories/base.repository';
import { InventoryLotStatus } from '@/types';

export const INVENTORY_LOT_STATUSES = [
  'in_stock',
  'low_stock',
  'reserved',
  'sold_out',
  'depleted',
  'critical',
  'expired',
] as const;

export interface ServerInventoryLot extends Identifiable {
  id: string;
  productLotId: string;
  productId: string;
  ownerId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  warehouseLocation: string;
  storageCondition: string;
  receivedAt: string;
  expiryDate: string;
  status: InventoryLotStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculates current status based on quantity, reserved quantity, and expiry.
 * Invariant: availableQuantity = quantity - reservedQuantity >= 0.
 */
export function calculateInventoryStatus(
  quantity: number,
  reservedQuantity: number,
  expiryDate?: string
): InventoryLotStatus {
  if (expiryDate) {
    const expiry = new Date(expiryDate).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return 'expired';
    }
  }

  const available = quantity - reservedQuantity;

  if (quantity <= 0 || available <= 0) {
    return reservedQuantity > 0 ? 'reserved' : 'sold_out';
  }

  if (available < 50) {
    return 'critical';
  }

  if (available < 200) {
    return 'low_stock';
  }

  return 'in_stock';
}

export const AdjustStockSchema = z
  .object({
    adjustmentType: z.enum(['increase', 'decrease', 'correction']),
    quantity: z.number().positive('Quantity must be greater than zero'),
    reason: z.string().min(3, 'Reason must be at least 3 characters').max(200),
  })
  .strict();

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;

export const ReserveStockSchema = z
  .object({
    quantity: z.number().positive('Reservation quantity must be greater than zero'),
    orderReference: z.string().max(100).optional(),
    idempotencyKey: z.string().max(100).optional(),
  })
  .strict();

export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;

export const ReleaseStockSchema = z
  .object({
    quantity: z.number().positive('Release quantity must be greater than zero'),
    orderReference: z.string().max(100).optional(),
    idempotencyKey: z.string().max(100).optional(),
  })
  .strict();

export type ReleaseStockInput = z.infer<typeof ReleaseStockSchema>;
