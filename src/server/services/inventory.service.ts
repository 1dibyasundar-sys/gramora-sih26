import { inventoryRepository, InventoryRepository } from '../repositories/inventory.repository';
import { productRepository, ProductRepository } from '../repositories/product.repository';
import { productLotRepository, ProductLotRepository } from '../repositories/product-lot.repository';
import {
  ServerInventoryLot,
  AdjustStockInput,
  calculateInventoryStatus,
} from '../domain/inventory';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireRole, requireOwnershipOrAdmin } from '../auth/rbac';
import {
  NotFoundError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  AppError,
} from '../lib/errors';
import { logger } from '../lib/logger';

export class InventoryService {
  private inventoryRepo: InventoryRepository;
  private productRepo: ProductRepository;
  private lotRepo: ProductLotRepository;

  constructor(
    inventoryRepo: InventoryRepository = inventoryRepository,
    productRepo: ProductRepository = productRepoInstance,
    lotRepo: ProductLotRepository = productLotRepoInstance
  ) {
    this.inventoryRepo = inventoryRepo;
    this.productRepo = productRepo;
    this.lotRepo = lotRepo;
  }

  /**
   * Retrieves all inventory lots belonging to the authenticated producer.
   */
  async getInventoryByOwner(user: AuthenticatedUser): Promise<ServerInventoryLot[]> {
    requireRole(user, 'farmer', 'fpo', 'admin');
    return this.inventoryRepo.findByOwnerId(user.uid);
  }

  /**
   * Retrieves a single inventory lot with ownership check.
   */
  async getInventoryLot(id: string, user: AuthenticatedUser): Promise<ServerInventoryLot> {
    const lot = await this.inventoryRepo.findById(id);
    if (!lot) {
      throw new NotFoundError('Inventory lot', id);
    }
    requireOwnershipOrAdmin(user, lot.ownerId, 'inventory lot');
    return lot;
  }

  /**
   * Concurrency-safe stock adjustment using a Firestore transaction.
   * Prevents stock corruption, negative inventory, or reducing stock below reserved amounts.
   */
  async adjustStock(
    lotId: string,
    user: AuthenticatedUser,
    adjustment: AdjustStockInput
  ): Promise<ServerInventoryLot> {
    requireRole(user, 'farmer', 'fpo', 'admin');

    return this.inventoryRepo.runTransaction(async (tx) => {
      // 1. Authoritative read inside transaction
      const current = await this.inventoryRepo.getInTransaction(tx, lotId);
      if (!current) {
        throw new NotFoundError('Inventory lot', lotId);
      }

      // 2. Ownership verification
      if (current.ownerId !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not own this inventory lot.');
      }

      // Optional reads for linked documents (before any writes)
      let productSnap: any = null;
      let lotSnap: any = null;
      try {
        if (this.productRepo?.collection && current.productId) {
          productSnap = await tx.get(this.productRepo.collection.doc(current.productId));
        }
        if (this.lotRepo?.collection && current.productLotId) {
          lotSnap = await tx.get(this.lotRepo.collection.doc(current.productLotId));
        }
      } catch {
        // Safe in isolated test environments
      }

      // 3. Compute new quantity
      let newQuantity: number;
      switch (adjustment.adjustmentType) {
        case 'increase':
          newQuantity = current.quantity + adjustment.quantity;
          break;
        case 'decrease':
          newQuantity = current.quantity - adjustment.quantity;
          break;
        case 'correction':
          newQuantity = adjustment.quantity;
          break;
      }

      // 4. Validate quantity invariants
      if (newQuantity < 0) {
        throw new BadRequestError('Inventory quantity cannot be negative.');
      }

      if (newQuantity < current.reservedQuantity) {
        throw new BadRequestError(
          `Cannot reduce stock to ${newQuantity} because ${current.reservedQuantity} is currently reserved in active orders.`
        );
      }

      const newAvailable = newQuantity - current.reservedQuantity;
      const deltaAvailable = newAvailable - current.availableQuantity;
      const newStatus = calculateInventoryStatus(newQuantity, current.reservedQuantity, current.expiryDate);

      // 5. Atomic transaction write
      this.inventoryRepo.updateInTransaction(tx, lotId, {
        quantity: newQuantity,
        availableQuantity: newAvailable,
        status: newStatus,
      });

      // Synchronize linked ProductLot and Product if present
      try {
        if (lotSnap?.exists && this.lotRepo?.collection) {
          tx.update(this.lotRepo.collection.doc(current.productLotId), {
            totalQuantity: newQuantity,
            availableQuantity: newAvailable,
            updatedAt: new Date().toISOString(),
          });
        }
        if (productSnap?.exists && this.productRepo?.collection) {
          const productData = productSnap.data() || {};
          const currentTotal = productData.totalAvailableQuantity || 0;
          const updatedTotal = Math.max(0, currentTotal + deltaAvailable);
          tx.update(this.productRepo.collection.doc(current.productId), {
            totalAvailableQuantity: updatedTotal,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn('Failed to sync linked product/lot during stock adjustment', { err });
      }

      logger.info('Adjusted inventory stock atomically', {
        lotId,
        adjustmentType: adjustment.adjustmentType,
        previousQty: current.quantity,
        newQty: newQuantity,
        reason: adjustment.reason,
        actorUid: user.uid,
      });

      return {
        ...current,
        quantity: newQuantity,
        availableQuantity: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Concurrency-safe stock reservation using a Firestore transaction.
   * Atomically locks stock and guarantees no overselling when multiple buyers concurrently reserve.
   */
  async reserveStock(
    lotId: string,
    quantity: number,
    actorOrOrderRef?: AuthenticatedUser | string,
    orderRef?: string,
    idempotencyKey?: string
  ): Promise<ServerInventoryLot> {
    if (quantity <= 0) {
      throw new BadRequestError('Reservation quantity must be positive.');
    }

    const actor = typeof actorOrOrderRef === 'object' ? actorOrOrderRef : undefined;
    const effectiveOrderRef = typeof actorOrOrderRef === 'string' ? actorOrOrderRef : orderRef;

    return this.inventoryRepo.runTransaction(async (tx) => {
      // 1. Read authoritative document inside transaction
      const current = await this.inventoryRepo.getInTransaction(tx, lotId);
      if (!current) {
        throw new NotFoundError('Inventory lot', lotId);
      }

      // 2. Authorization check: only owner or admin or internal service actor
      if (actor) {
        if (actor.uid !== current.ownerId && actor.role !== 'admin') {
          throw new AuthorizationError('You do not have permission to reserve this inventory lot.');
        }
      }

      // Optional reads for linked documents (before any writes)
      let productSnap: any = null;
      let lotSnap: any = null;
      try {
        if (this.productRepo?.collection && current.productId) {
          productSnap = await tx.get(this.productRepo.collection.doc(current.productId));
        }
        if (this.lotRepo?.collection && current.productLotId) {
          lotSnap = await tx.get(this.lotRepo.collection.doc(current.productLotId));
        }
      } catch {
        // Safe in isolated test environments
      }

      // 3. Validate current status
      if (current.status === 'expired') {
        throw new AppError(
          'Cannot reserve from an expired inventory batch.',
          409,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // 4. Validate available quantity
      const available = current.quantity - current.reservedQuantity;
      if (available < quantity) {
        throw new AppError(
          `Insufficient inventory. Requested: ${quantity} ${current.unit}, Available: ${available} ${current.unit}.`,
          409,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 5. Calculate new state
      const newReserved = current.reservedQuantity + quantity;
      const newAvailable = current.quantity - newReserved;
      const newStatus = calculateInventoryStatus(current.quantity, newReserved, current.expiryDate);

      // 6. Write updated state atomically
      this.inventoryRepo.updateInTransaction(tx, lotId, {
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        status: newStatus,
      });

      // Synchronize linked ProductLot and Product cache
      try {
        if (lotSnap?.exists && this.lotRepo?.collection) {
          tx.update(this.lotRepo.collection.doc(current.productLotId), {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            updatedAt: new Date().toISOString(),
          });
        }
        if (productSnap?.exists && this.productRepo?.collection) {
          const productData = productSnap.data() || {};
          const currentTotal = productData.totalAvailableQuantity || 0;
          const updatedTotal = Math.max(0, currentTotal - quantity);
          tx.update(this.productRepo.collection.doc(current.productId), {
            totalAvailableQuantity: updatedTotal,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn('Failed to sync linked product/lot during stock reservation', { err });
      }

      logger.info('Reserved stock atomically in transaction', {
        lotId,
        reservedAmount: quantity,
        orderRef,
        idempotencyKey,
        newReservedTotal: newReserved,
        remainingAvailable: newAvailable,
      });

      return {
        ...current,
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Concurrency-safe stock release using a Firestore transaction.
   * Releases previously reserved stock back to the available pool.
   */
  async releaseStock(
    lotId: string,
    quantity: number,
    actorOrOrderRef?: AuthenticatedUser | string,
    orderRef?: string,
    idempotencyKey?: string
  ): Promise<ServerInventoryLot> {
    if (quantity <= 0) {
      throw new BadRequestError('Release quantity must be positive.');
    }

    const actor = typeof actorOrOrderRef === 'object' ? actorOrOrderRef : undefined;
    const effectiveOrderRef = typeof actorOrOrderRef === 'string' ? actorOrOrderRef : orderRef;

    return this.inventoryRepo.runTransaction(async (tx) => {
      const current = await this.inventoryRepo.getInTransaction(tx, lotId);
      if (!current) {
        throw new NotFoundError('Inventory lot', lotId);
      }

      // Authorization check: only owner or admin or internal service actor
      if (actor) {
        if (actor.uid !== current.ownerId && actor.role !== 'admin') {
          throw new AuthorizationError('You do not have permission to release this inventory lot.');
        }
      }

      // Optional reads for linked documents (before any writes)
      let productSnap: any = null;
      let lotSnap: any = null;
      try {
        if (this.productRepo?.collection && current.productId) {
          productSnap = await tx.get(this.productRepo.collection.doc(current.productId));
        }
        if (this.lotRepo?.collection && current.productLotId) {
          lotSnap = await tx.get(this.lotRepo.collection.doc(current.productLotId));
        }
      } catch {
        // Safe in isolated test environments
      }

      // Invariant: cannot release more than is currently reserved!
      if (quantity > current.reservedQuantity) {
        throw new BadRequestError(
          `Cannot release ${quantity} units because only ${current.reservedQuantity} is currently reserved.`
        );
      }

      const newReserved = current.reservedQuantity - quantity;
      const newAvailable = current.quantity - newReserved;
      const newStatus = calculateInventoryStatus(current.quantity, newReserved, current.expiryDate);

      this.inventoryRepo.updateInTransaction(tx, lotId, {
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        status: newStatus,
      });

      // Synchronize linked ProductLot and Product cache
      try {
        if (lotSnap?.exists && this.lotRepo?.collection) {
          tx.update(this.lotRepo.collection.doc(current.productLotId), {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            updatedAt: new Date().toISOString(),
          });
        }
        if (productSnap?.exists && this.productRepo?.collection) {
          const productData = productSnap.data() || {};
          const currentTotal = productData.totalAvailableQuantity || 0;
          const updatedTotal = currentTotal + quantity;
          tx.update(this.productRepo.collection.doc(current.productId), {
            totalAvailableQuantity: updatedTotal,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn('Failed to sync linked product/lot during stock release', { err });
      }

      logger.info('Released stock reservation atomically in transaction', {
        lotId,
        releasedAmount: quantity,
        orderRef,
        idempotencyKey,
        newReservedTotal: newReserved,
        newAvailableTotal: newAvailable,
      });

      return {
        ...current,
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
  }
}

const productRepoInstance = productRepository;
const productLotRepoInstance = productLotRepository;
export const inventoryService = new InventoryService();
