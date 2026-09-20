import { productLotRepository, ProductLotRepository } from '../repositories/product-lot.repository';
import { productRepository, ProductRepository } from '../repositories/product.repository';
import { inventoryRepository, InventoryRepository } from '../repositories/inventory.repository';
import {
  ServerProductLot,
  CreateProductLotInput,
  UpdateProductLotInput,
} from '../domain/product';
import { ServerInventoryLot, calculateInventoryStatus } from '../domain/inventory';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireRole, requireExactRole, requireOwnershipOrAdmin } from '../auth/rbac';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface CreateLotResult {
  lot: ServerProductLot;
  inventory: ServerInventoryLot;
}

export class ProductLotService {
  private lotRepo: ProductLotRepository;
  private productRepo: ProductRepository;
  private inventoryRepo: InventoryRepository;

  constructor(
    lotRepo: ProductLotRepository = productLotRepository,
    productRepo: ProductRepository = productRepository,
    inventoryRepo: InventoryRepository = inventoryRepository
  ) {
    this.lotRepo = lotRepo;
    this.productRepo = productRepo;
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * Creates a new harvest batch lot for a product, and atomically creates the linked inventory lot
   * while updating the parent product's available quantity.
   * Restricted strictly to 'farmer' and 'fpo' producers.
   */
  async createLot(user: AuthenticatedUser, input: CreateProductLotInput): Promise<CreateLotResult> {
    requireExactRole(user, 'farmer', 'fpo');

    const product = await this.productRepo.findById(input.productId);
    if (!product || product.listingStatus === 'archived') {
      throw new NotFoundError('Product listing', input.productId);
    }

    requireOwnershipOrAdmin(user, product.sellerId, 'product listing');

    const lotNumber =
      input.lotNumber ||
      `LOT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const lotRecord: Omit<ServerProductLot, 'id' | 'createdAt' | 'updatedAt'> = {
      productId: input.productId,
      sellerId: user.uid,
      productName: product.title,
      lotNumber,
      harvestDate: input.harvestDate,
      expiryDate: input.expiryDate,
      totalQuantity: input.totalQuantity,
      availableQuantity: input.totalQuantity,
      reservedQuantity: 0,
      unit: input.unit,
      qualityGrade: input.qualityGrade,
      qualityScore: input.qualityScore ?? 90,
      moistureContentPercent: input.moistureContentPercent,
      storageType: input.storageType,
      storageFacility: input.storageFacility,
      status: input.status || 'available',
      farmGatePrice: input.farmGatePrice || product.pricePerUnit,
      sellingPrice: input.sellingPrice || product.pricePerUnit,
      minOrderQuantity: input.minOrderQuantity || product.minOrderQuantity,
      agmarkGrade: input.agmarkGrade,
    };

    const initialStatus = calculateInventoryStatus(input.totalQuantity, 0, input.expiryDate);

    // Atomic batch creation when connected to Firestore
    const db = (this.lotRepo as any).db;
    if (db && typeof db.batch === 'function') {
      const batch = db.batch();
      const lotRef = this.lotRepo.collection.doc();
      const invRef = this.inventoryRepo.collection.doc();
      const productRef = this.productRepo.collection.doc(product.id);

      const lotId = lotRef.id;
      const invId = invRef.id;

      const createdLot: ServerProductLot = {
        ...lotRecord,
        id: lotId,
        createdAt: now,
        updatedAt: now,
      };

      const createdInventory: ServerInventoryLot = {
        id: invId,
        productLotId: lotId,
        productId: product.id,
        ownerId: user.uid,
        quantity: input.totalQuantity,
        reservedQuantity: 0,
        availableQuantity: input.totalQuantity,
        unit: input.unit,
        warehouseLocation: input.storageFacility,
        storageCondition: input.storageType,
        receivedAt: input.harvestDate,
        expiryDate: input.expiryDate,
        status: initialStatus,
        createdAt: now,
        updatedAt: now,
      };

      const updatedStock = (product.totalAvailableQuantity || 0) + input.totalQuantity;

      batch.set(lotRef, createdLot);
      batch.set(invRef, createdInventory);
      batch.update(productRef, {
        totalAvailableQuantity: updatedStock,
        updatedAt: now,
      });

      await batch.commit();

      if ((this.lotRepo as any).lots) {
        (this.lotRepo as any).lots.set(lotId, createdLot);
      }
      if ((this.inventoryRepo as any).store) {
        (this.inventoryRepo as any).store.set(invId, createdInventory);
      }
      if ((this.productRepo as any).store) {
        const p = (this.productRepo as any).store.get(product.id);
        if (p) {
          (this.productRepo as any).store.set(product.id, {
            ...p,
            totalAvailableQuantity: updatedStock,
            updatedAt: now,
          });
        }
      }

      logger.info('Created product lot and linked inventory lot atomically', {
        lotId,
        productId: product.id,
        sellerId: user.uid,
        quantity: input.totalQuantity,
      });

      return { lot: createdLot, inventory: createdInventory };
    }

    // Fallback for mock repository test environments
    const createdLot = await this.lotRepo.create(lotRecord as Omit<ServerProductLot, 'id'>);
    const inventoryRecord: Omit<ServerInventoryLot, 'id' | 'createdAt' | 'updatedAt'> = {
      productLotId: createdLot.id,
      productId: product.id,
      ownerId: user.uid,
      quantity: input.totalQuantity,
      reservedQuantity: 0,
      availableQuantity: input.totalQuantity,
      unit: input.unit,
      warehouseLocation: input.storageFacility,
      storageCondition: input.storageType,
      receivedAt: input.harvestDate,
      expiryDate: input.expiryDate,
      status: initialStatus,
    };

    const createdInventory = await this.inventoryRepo.create(
      inventoryRecord as Omit<ServerInventoryLot, 'id'>
    );

    const updatedStock = (product.totalAvailableQuantity || 0) + input.totalQuantity;
    await this.productRepo.update(product.id, { totalAvailableQuantity: updatedStock });

    logger.info('Created product lot and linked inventory lot', {
      lotId: createdLot.id,
      productId: product.id,
      sellerId: user.uid,
      quantity: input.totalQuantity,
    });

    return { lot: createdLot, inventory: createdInventory };
  }

  /**
   * Retrieves lots for a specific product.
   */
  async getLotsByProduct(productId: string): Promise<ServerProductLot[]> {
    return this.lotRepo.findByProductId(productId);
  }

  /**
   * Retrieves all lots for the authenticated seller.
   */
  async getLotsBySeller(user: AuthenticatedUser): Promise<ServerProductLot[]> {
    return this.lotRepo.findBySellerId(user.uid);
  }

  /**
   * Retrieves a single lot by ID.
   */
  async getLotById(id: string): Promise<ServerProductLot> {
    const lot = await this.lotRepo.findById(id);
    if (!lot) {
      throw new NotFoundError('Harvest lot', id);
    }
    return lot;
  }

  /**
   * Updates lot fields.
   */
  async updateLot(
    id: string,
    user: AuthenticatedUser,
    updates: UpdateProductLotInput
  ): Promise<ServerProductLot> {
    const existing = await this.lotRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Harvest lot', id);
    }

    requireOwnershipOrAdmin(user, existing.sellerId, 'harvest lot');

    logger.info('Updating harvest lot', { id, actorId: user.uid });
    return this.lotRepo.update(id, updates);
  }
}

export const productLotService = new ProductLotService();
