import { productRepository, ProductRepository, PaginatedProductsResult } from '../repositories/product.repository';
import { productLotRepository, ProductLotRepository } from '../repositories/product-lot.repository';
import { inventoryRepository, InventoryRepository } from '../repositories/inventory.repository';
import {
  ServerProduct,
  ServerProductLot,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from '../domain/product';
import { ServerInventoryLot, calculateInventoryStatus } from '../domain/inventory';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireRole, requireExactRole, requireOwnershipOrAdmin } from '../auth/rbac';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface ProductDetailResult {
  product: ServerProduct;
  lots: ServerProductLot[];
}

export class ProductService {
  private productRepo: ProductRepository;
  private lotRepo: ProductLotRepository;
  private inventoryRepo: InventoryRepository;

  constructor(
    productRepo: ProductRepository = productRepository,
    lotRepo: ProductLotRepository = productLotRepository,
    inventoryRepo: InventoryRepository = inventoryRepository
  ) {
    this.productRepo = productRepo;
    this.lotRepo = lotRepo;
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * Creates a new agricultural catalog product listing.
   * Allowed roles: 'farmer', 'fpo' only (admin cannot create seller listings).
   * sellerId is derived authoritatively from the verified Firebase UID.
   * Atomically initializes Product, ProductLot, and InventoryLot when initial stock > 0.
   */
  async createProduct(user: AuthenticatedUser, input: CreateProductInput): Promise<ServerProduct> {
    requireExactRole(user, 'farmer', 'fpo');

    const pricePerUnitPaise = Math.round(input.pricePerUnit * 100);
    const sellerType = user.role === 'fpo' ? 'fpo' : 'farmer';
    const now = new Date().toISOString();

    const productRecord: Omit<ServerProduct, 'id' | 'createdAt' | 'updatedAt'> = {
      ...input,
      marketMandiPrice: input.marketMandiPrice ?? Math.round(input.pricePerUnit * 1.3),
      sellerId: user.uid,
      sellerName: user.name || user.organization || 'Verified Producer',
      sellerType,
      sellerRating: 5.0,
      sellerVerified: user.verified,
      pricePerUnitPaise,
      listingStatus: input.listingStatus || 'active',
      totalAvailableQuantity: input.totalAvailableQuantity || 0,
      tags: input.tags || [],
      images: input.images || [],
    };

    logger.info('Creating catalog product listing', {
      sellerId: user.uid,
      title: input.title,
      category: input.category,
      initialQuantity: input.totalAvailableQuantity,
    });

    // Check if Firestore batch write is available for atomic creation
    const db = (this.productRepo as any).db;
    if (db && typeof db.batch === 'function' && input.totalAvailableQuantity > 0) {
      const batch = db.batch();
      const productRef = this.productRepo.collection.doc();
      const lotRef = this.lotRepo.collection.doc();
      const invRef = this.inventoryRepo.collection.doc();

      const productId = productRef.id;
      const lotId = lotRef.id;
      const invId = invRef.id;

      const createdProduct: ServerProduct = {
        ...productRecord,
        id: productId,
        createdAt: now,
        updatedAt: now,
      } as ServerProduct;

      const expiryDate = new Date(
        new Date(input.harvestDate).getTime() + (input.shelfLifeDays || 30) * 86400000
      )
        .toISOString()
        .split('T')[0];

      const lotRecord: ServerProductLot = {
        id: lotId,
        productId,
        sellerId: user.uid,
        productName: input.title,
        lotNumber: `LOT-INIT-${productId.slice(-6).toUpperCase()}`,
        harvestDate: input.harvestDate,
        expiryDate,
        totalQuantity: input.totalAvailableQuantity,
        availableQuantity: input.totalAvailableQuantity,
        reservedQuantity: 0,
        unit: input.unit,
        qualityGrade: input.qualityGrade,
        qualityScore: 92,
        moistureContentPercent: input.moistureContentPercent,
        storageType: input.storageType,
        storageFacility: `${input.location.district} Aggregation Center`,
        status: 'available',
        farmGatePrice: input.pricePerUnit,
        sellingPrice: input.pricePerUnit,
        minOrderQuantity: input.minOrderQuantity,
        createdAt: now,
        updatedAt: now,
      };

      const invStatus = calculateInventoryStatus(input.totalAvailableQuantity, 0, expiryDate);
      const inventoryRecord: ServerInventoryLot = {
        id: invId,
        productLotId: lotId,
        productId,
        ownerId: user.uid,
        quantity: input.totalAvailableQuantity,
        reservedQuantity: 0,
        availableQuantity: input.totalAvailableQuantity,
        unit: input.unit,
        warehouseLocation: `${input.location.district} Aggregation Center`,
        storageCondition: input.storageType,
        receivedAt: input.harvestDate,
        expiryDate,
        status: invStatus,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(productRef, createdProduct);
      batch.set(lotRef, lotRecord);
      batch.set(invRef, inventoryRecord);
      await batch.commit();

      if ((this.productRepo as any).store) {
        (this.productRepo as any).store.set(productId, createdProduct);
      }
      if ((this.lotRepo as any).lots) {
        (this.lotRepo as any).lots.set(lotId, lotRecord);
      }
      if ((this.inventoryRepo as any).store) {
        (this.inventoryRepo as any).store.set(invId, inventoryRecord);
      }

      logger.info('Atomically created Product, ProductLot, and InventoryLot', {
        productId,
        lotId,
        invId,
        quantity: input.totalAvailableQuantity,
      });

      return createdProduct;
    }

    // Default repository creation (e.g. In-memory / mock repo test environments)
    const created = await this.productRepo.create(productRecord as Omit<ServerProduct, 'id'>);
    return created;
  }

  /**
   * Queries marketplace products with filtering, sorting, and pagination.
   */
  async getProducts(query: ProductQueryInput): Promise<PaginatedProductsResult> {
    return this.productRepo.searchAndFilter(query);
  }

  /**
   * Retrieves single product detail including active harvest lots.
   */
  async getProductById(id: string, user?: AuthenticatedUser | null): Promise<ProductDetailResult> {
    const product = await this.productRepo.findById(id);

    if (!product || product.listingStatus === 'archived') {
      throw new NotFoundError('Product listing', id);
    }

    // If draft, only the owner or an admin may view it
    if (product.listingStatus === 'draft') {
      if (!user || (user.uid !== product.sellerId && user.role !== 'admin')) {
        throw new NotFoundError('Product listing', id);
      }
    }

    // Retrieve active harvest lots for this catalog product
    const lots = await this.lotRepo.findActiveLots(id);

    return { product, lots };
  }

  /**
   * Updates an existing catalog listing.
   * Only the owner or an admin can update.
   */
  async updateProduct(
    id: string,
    user: AuthenticatedUser,
    updates: UpdateProductInput
  ): Promise<ServerProduct> {
    const existing = await this.productRepo.findById(id);
    if (!existing || existing.listingStatus === 'archived') {
      throw new NotFoundError('Product listing', id);
    }

    requireOwnershipOrAdmin(user, existing.sellerId, 'product listing');

    const sanitizedUpdates: Partial<Omit<ServerProduct, 'id' | 'createdAt' | 'updatedAt'>> = {
      ...updates,
    };

    if (updates.pricePerUnit !== undefined) {
      sanitizedUpdates.pricePerUnitPaise = Math.round(updates.pricePerUnit * 100);
    }

    logger.info('Updating product listing', { id, actorId: user.uid });
    return this.productRepo.update(id, sanitizedUpdates);
  }

  /**
   * Archives a product (soft delete).
   */
  async archiveProduct(id: string, user: AuthenticatedUser): Promise<ServerProduct> {
    const existing = await this.productRepo.findById(id);
    if (!existing || existing.listingStatus === 'archived') {
      throw new NotFoundError('Product listing', id);
    }

    requireOwnershipOrAdmin(user, existing.sellerId, 'product listing');

    logger.info('Archiving product listing', { id, actorId: user.uid });
    return this.productRepo.update(id, { listingStatus: 'archived' });
  }

  /**
   * Lists all products belonging to a seller.
   */
  async getProductsBySeller(sellerId: string): Promise<ServerProduct[]> {
    return this.productRepo.findBySeller(sellerId);
  }
}

export const productService = new ProductService();
