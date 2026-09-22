import { z } from 'zod';
import { Identifiable } from '../repositories/base.repository';
import {
  ProductCategory,
  QualityGrade,
  StorageType,
  ProductListingStatus,
  ProductLotStatus,
} from '@/types';

export const PRODUCT_CATEGORIES = [
  'grains',
  'pulses',
  'vegetables',
  'fruits',
  'spices',
  'oilseeds',
  'organic',
] as const;

export const QUALITY_GRADES = [
  'Grade A (Export)',
  'Grade A',
  'Grade B',
  'Organic Certified',
] as const;

export const STORAGE_TYPES = [
  'Cold Storage',
  'Ambient Warehouse',
  'Farm Gate Dry',
] as const;

export const PRODUCT_LISTING_STATUSES = [
  'draft',
  'pending_verification',
  'active',
  'paused',
  'sold_out',
  'out_of_stock',
  'archived',
] as const;

export const PRODUCT_LOT_STATUSES = [
  'available',
  'reserved',
  'sold',
  'depleted',
  'expired',
  'blocked',
] as const;

export interface ProductLocation {
  district: string;
  state: string;
  distanceKm?: number;
}

/**
 * Authoritative Server Product document stored in Firestore ('products/{productId}').
 */
export interface ServerProduct extends Identifiable {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'farmer' | 'fpo';
  sellerRating: number;
  sellerVerified: boolean;
  title: string;
  category: ProductCategory;
  subcategory?: string;
  variety: string;
  pricePerUnit: number;
  pricePerUnitPaise: number; // Integer minor currency units (paise)
  unit: 'kg' | 'quintal' | 'tonne' | 'crate' | 'box';
  marketMandiPrice: number;
  minOrderQuantity: number;
  totalAvailableQuantity: number;
  listingStatus: ProductListingStatus;
  location: ProductLocation;
  images: string[];
  harvestDate: string;
  shelfLifeDays: number;
  qualityGrade: QualityGrade;
  moistureContentPercent?: number;
  storageType: StorageType;
  description: string;
  organicCertified: boolean;
  featured?: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Authoritative Server ProductLot document stored in Firestore ('productLots/{productLotId}').
 */
export interface ServerProductLot extends Identifiable {
  id: string;
  productId: string;
  sellerId: string;
  productName: string;
  lotNumber: string;
  harvestDate: string;
  expiryDate: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  unit: string;
  qualityGrade: QualityGrade;
  qualityScore: number; // 0 - 100
  moistureContentPercent?: number;
  storageType: StorageType;
  storageFacility: string;
  status: ProductLotStatus;
  farmGatePrice?: number;
  sellingPrice?: number;
  minOrderQuantity?: number;
  agmarkGrade?: string;
  createdAt: string;
  updatedAt: string;
}

const locationSchema = z.object({
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  distanceKm: z.number().nonnegative().optional(),
});

/**
 * Strict schema for POST /api/v1/products.
 * Privileged fields (sellerId, sellerRating, sellerVerified, id, createdAt, updatedAt)
 * are rejected if supplied by client.
 */
export const CreateProductSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    category: z.enum(PRODUCT_CATEGORIES),
    subcategory: z.string().max(100).optional(),
    variety: z.string().min(2, 'Variety must be at least 2 characters').max(100),
    pricePerUnit: z
      .number()
      .positive('Price per unit must be greater than zero')
      .refine((val) => Number.isFinite(val), 'Price must be a valid finite number')
      .refine(
        (val) => Math.round(val * 100) === val * 100,
        'Price cannot have more than 2 decimal places (paise precision)'
      ),
    unit: z.enum(['kg', 'quintal', 'tonne', 'crate', 'box']),
    marketMandiPrice: z.number().positive().optional(),
    minOrderQuantity: z.number().positive('Minimum order quantity must be greater than zero'),
    totalAvailableQuantity: z.number().nonnegative().default(0),
    location: locationSchema,
    images: z.array(z.string().url('Image must be a valid URL')).default([]),
    harvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Harvest date must be YYYY-MM-DD'),
    shelfLifeDays: z.number().int().positive('Shelf life must be a positive integer'),
    qualityGrade: z.enum(QUALITY_GRADES),
    moistureContentPercent: z.number().min(0).max(100).optional(),
    storageType: z.enum(STORAGE_TYPES),
    description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
    organicCertified: z.boolean().default(false),
    featured: z.boolean().optional(),
    tags: z.array(z.string().max(50)).default([]),
    listingStatus: z.enum(['draft', 'active']).default('active'),
  })
  .strict()
  .refine(
    (data) => {
      const expiry =
        new Date(data.harvestDate).getTime() + (data.shelfLifeDays || 30) * 86400000;
      return expiry > Date.now();
    },
    {
      message: 'Harvest date and shelf life must result in a future expiry date',
      path: ['harvestDate'],
    }
  );

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/**
 * Strict schema for PATCH /api/v1/products/{id}.
 * Disallows mutating sellerId, id, rating, or timestamps.
 */
export const UpdateProductSchema = z
  .object({
    title: z.string().min(3).max(150).optional(),
    category: z.enum(PRODUCT_CATEGORIES).optional(),
    subcategory: z.string().max(100).optional(),
    variety: z.string().min(2).max(100).optional(),
    pricePerUnit: z
      .number()
      .positive()
      .refine(
        (val) => Math.round(val * 100) === val * 100,
        'Price cannot have more than 2 decimal places'
      )
      .optional(),
    unit: z.enum(['kg', 'quintal', 'tonne', 'crate', 'box']).optional(),
    marketMandiPrice: z.number().positive().optional(),
    minOrderQuantity: z.number().positive().optional(),
    totalAvailableQuantity: z.number().nonnegative().optional(),
    location: locationSchema.optional(),
    images: z.array(z.string().url()).optional(),
    harvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    shelfLifeDays: z.number().int().positive().optional(),
    qualityGrade: z.enum(QUALITY_GRADES).optional(),
    moistureContentPercent: z.number().min(0).max(100).optional(),
    storageType: z.enum(STORAGE_TYPES).optional(),
    description: z.string().min(5).max(2000).optional(),
    organicCertified: z.boolean().optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string().max(50)).optional(),
    listingStatus: z.enum(PRODUCT_LISTING_STATUSES).optional(),
  })
  .strict();

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

/**
 * Strict schema for POST /api/v1/product-lots.
 */
export const CreateProductLotSchema = z
  .object({
    productId: z.string().min(1, 'Product ID is required'),
    lotNumber: z.string().min(2).max(50).optional(),
    harvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalQuantity: z.number().positive('Total quantity must be greater than zero'),
    unit: z.string().min(1).max(20).default('kg'),
    qualityGrade: z.enum(QUALITY_GRADES),
    qualityScore: z.number().min(0).max(100).default(90),
    moistureContentPercent: z.number().min(0).max(100).optional(),
    storageType: z.enum(STORAGE_TYPES),
    storageFacility: z.string().min(2).max(150),
    farmGatePrice: z.number().positive().optional(),
    sellingPrice: z.number().positive().optional(),
    minOrderQuantity: z.number().positive().optional(),
    agmarkGrade: z.string().max(50).optional(),
    status: z.enum(PRODUCT_LOT_STATUSES).default('available'),
  })
  .strict();

export type CreateProductLotInput = z.infer<typeof CreateProductLotSchema>;

/**
 * Strict schema for PATCH /api/v1/product-lots/{id}.
 */
export const UpdateProductLotSchema = z
  .object({
    qualityGrade: z.enum(QUALITY_GRADES).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    moistureContentPercent: z.number().min(0).max(100).optional(),
    storageFacility: z.string().min(2).max(150).optional(),
    storageType: z.enum(STORAGE_TYPES).optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    farmGatePrice: z.number().positive().optional(),
    sellingPrice: z.number().positive().optional(),
    // Manual updates only permit available or blocked; reserved/sold/depleted/expired are server-controlled
    status: z.enum(['available', 'blocked']).optional(),
  })
  .strict();

export type UpdateProductLotInput = z.infer<typeof UpdateProductLotSchema>;

/**
 * Query schema for GET /api/v1/products.
 */
export const ProductQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).or(z.literal('all')).optional(),
  search: z.string().max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  qualityGrade: z.string().optional(),
  organicOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest']).optional(),
  sellerId: z.string().optional(),
  status: z.enum(PRODUCT_LISTING_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
