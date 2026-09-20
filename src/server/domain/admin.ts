import { z } from 'zod';
import { UserRole, ProductCategory, ProductListingStatus, OrderStatus } from '@/types';
import { Identifiable } from '../repositories/base.repository';

export interface AdminDashboardMetrics {
  users: {
    total: number;
    farmers: number;
    fpos: number;
    buyers: number;
    consumers: number;
    logistics: number;
    admins: number;
    verified: number;
    pendingVerification: number;
  };
  products: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    totalGmvPaise: number;
    totalGmvRupees: number;
  };
  inventory: {
    totalLots: number;
    totalStockKg: number;
  };
  systemHealth: {
    database: 'healthy' | 'degraded';
    cloudinary: 'configured' | 'unconfigured';
    timestamp: string;
  };
}

export interface ServerAuditLog extends Identifiable {
  id: string;
  actorUid: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  targetType: 'user' | 'product' | 'order' | 'inventory' | 'system';
  targetId: string;
  timestamp: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export const AdminUsersQuerySchema = z.object({
  role: z.string().optional(),
  status: z.enum(['active', 'suspended', 'deactivated', 'pending_onboarding']).optional(),
  verified: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type AdminUsersQueryInput = z.infer<typeof AdminUsersQuerySchema>;

export const VerifyUserSchema = z
  .object({
    verified: z.boolean(),
    reason: z.string().min(3, 'A reason must be documented for verification decisions').max(500),
  })
  .strict();

export type VerifyUserInput = z.infer<typeof VerifyUserSchema>;

export const SetUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'deactivated']),
    reason: z.string().min(5, 'A clear reason must be documented for status changes').max(500),
  })
  .strict();

export type SetUserStatusInput = z.infer<typeof SetUserStatusSchema>;

export const AdminProductsQuerySchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  sellerId: z.string().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type AdminProductsQueryInput = z.infer<typeof AdminProductsQuerySchema>;

export const ModerateProductSchema = z
  .object({
    listingStatus: z.enum(['active', 'paused', 'archived']),
    reason: z.string().min(5, 'A clear reason must be documented for product moderation').max(500),
  })
  .strict();

export type ModerateProductInput = z.infer<typeof ModerateProductSchema>;

export const AdminOrdersQuerySchema = z.object({
  status: z.string().optional(),
  buyerId: z.string().optional(),
  sellerId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AdminOrdersQueryInput = z.infer<typeof AdminOrdersQuerySchema>;
