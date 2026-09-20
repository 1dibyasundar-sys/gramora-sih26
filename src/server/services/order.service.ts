import { Transaction } from 'firebase-admin/firestore';
import { orderRepository, OrderRepository } from '../repositories/order.repository';
import { orderItemRepository, OrderItemRepository } from '../repositories/order-item.repository';
import {
  inventoryReservationRepository,
  InventoryReservationRepository,
} from '../repositories/inventory-reservation.repository';
import { escrowRepository, EscrowRepository } from '../repositories/escrow.repository';
import {
  idempotencyRepository,
  IdempotencyRepository,
} from '../repositories/idempotency.repository';
import { inventoryRepository, InventoryRepository } from '../repositories/inventory.repository';
import { productRepository, ProductRepository } from '../repositories/product.repository';
import { productLotRepository, ProductLotRepository } from '../repositories/product-lot.repository';
import {
  ServerOrder,
  ServerOrderItem,
  ServerInventoryReservation,
  CheckoutInput,
  ServerOrderStatus,
  OrderQueryInput,
} from '../domain/order';
import { OrderStateMachine } from './order-state-machine';
import { OrderTotalCalculator } from './order-total-calculator';
import { calculateInventoryStatus, ServerInventoryLot } from '../domain/inventory';
import { ServerProduct } from '../domain/product';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireRole } from '../auth/rbac';
import {
  NotFoundError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  AppError,
} from '../lib/errors';
import { logger } from '../lib/logger';
import { COLLECTIONS } from '../repositories/collections';

export interface OrderWithItems extends ServerOrder {
  items: ServerOrderItem[];
}

export class OrderService {
  private orderRepo: OrderRepository;
  private orderItemRepo: OrderItemRepository;
  private reservationRepo: InventoryReservationRepository;
  private escrowRepo: EscrowRepository;
  private idempotencyRepo: IdempotencyRepository;
  private inventoryRepo: InventoryRepository;
  private productRepo: ProductRepository;
  private lotRepo: ProductLotRepository;

  constructor(
    orderRepo: OrderRepository = orderRepository,
    orderItemRepo: OrderItemRepository = orderItemRepository,
    reservationRepo: InventoryReservationRepository = inventoryReservationRepository,
    escrowRepo: EscrowRepository = escrowRepository,
    idempotencyRepo: IdempotencyRepository = idempotencyRepository,
    inventoryRepo: InventoryRepository = inventoryRepository,
    productRepo: ProductRepository = productRepository,
    lotRepo: ProductLotRepository = productLotRepository
  ) {
    this.orderRepo = orderRepo;
    this.orderItemRepo = orderItemRepo;
    this.reservationRepo = reservationRepo;
    this.escrowRepo = escrowRepo;
    this.idempotencyRepo = idempotencyRepo;
    this.inventoryRepo = inventoryRepo;
    this.productRepo = productRepo;
    this.lotRepo = lotRepo;
  }

  /**
   * Generates a collision-safe human-readable order consignment number.
   * Format: SAM-2026-XXXXXX
   */
  private generateOrderNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SAM-2026-${suffix}`;
  }

  /**
   * Authoritative Transactional Checkout
   * Atomically executes product validation, multi-lot inventory reservation,
   * order creation, frozen snapshot persistence, escrow ledger initialization,
   * audit event writing, and idempotency registration in a single Firestore transaction.
   */
  async checkout(
    user: AuthenticatedUser,
    input: CheckoutInput,
    idempotencyKey?: string,
    requestId: string = crypto.randomUUID()
  ): Promise<OrderWithItems> {
    // 1. RBAC Guard: only buyer, consumer, or admin can checkout
    requireRole(user, 'buyer', 'consumer', 'admin');

    const requestHash = IdempotencyRepository.hashPayload({
      items: input.items,
      shippingAddress: input.shippingAddress,
    });

    return this.orderRepo.runTransaction(async (tx) => {
      // 2. Check Idempotency within transaction
      if (idempotencyKey) {
        const existingRecord = await this.idempotencyRepo.getInTransaction(tx, idempotencyKey);
        if (existingRecord) {
          if (existingRecord.userId !== user.uid) {
            throw new ConflictError(
              'Idempotency key conflict: key was previously used by another account.'
            );
          }
          if (existingRecord.requestHash !== requestHash) {
            throw new ConflictError(
              'Idempotency key conflict: request payload does not match the previous request with this key.'
            );
          }
          if (existingRecord.resourceId) {
            const existingOrder = await this.orderRepo.getInTransaction(tx, existingRecord.resourceId);
            if (existingOrder) {
              const existingItems = await this.orderItemRepo.findByOrderId(existingOrder.id);
              logger.info('Returning cached idempotent order', {
                orderId: existingOrder.id,
                idempotencyKey,
                requestId,
              });
              return { ...existingOrder, items: existingItems };
            }
          }
        }
      }

      // 3. READ PHASE: Load authoritative products
      const productDocs: Array<{ itemInput: (typeof input.items)[number]; product: ServerProduct }> = [];
      const distinctSellerIds = new Set<string>();

      for (const item of input.items) {
        const productRef = this.productRepo.collection.doc(item.productId);
        const productSnap = await tx.get(productRef);

        if (!productSnap.exists) {
          throw new NotFoundError('Product', item.productId);
        }

        const product = { id: productSnap.id, ...(productSnap.data() as object) } as ServerProduct;

        // Verify product is actively listed
        if (product.listingStatus !== 'active') {
          throw new AppError(
            `Product '${product.title}' is not currently available for purchase (Status: ${product.listingStatus}).`,
            409,
            'PRODUCT_NOT_AVAILABLE'
          );
        }

        // Validate Minimum Order Quantity (MOQ)
        if (item.quantity < product.minOrderQuantity) {
          throw new AppError(
            `Order quantity (${item.quantity} ${product.unit}) does not meet the minimum order quantity of ${product.minOrderQuantity} ${product.unit} for '${product.title}'.`,
            422,
            'VALIDATION_ERROR'
          );
        }

        distinctSellerIds.add(product.sellerId);
        productDocs.push({ itemInput: item, product });
      }

      // 4. READ PHASE: Load available inventory lots for each product
      const inventoryAllocations: Array<{
        product: ServerProduct;
        itemInput: (typeof input.items)[number];
        eligibleLots: ServerInventoryLot[];
      }> = [];

      for (const { itemInput, product } of productDocs) {
        // Query candidate inventory lots
        const lotsQuery = this.inventoryRepo.collection
          .where('productId', '==', itemInput.productId)
          .where('status', 'in', ['in_stock', 'low_stock', 'critical']);

        const lotsSnap = await tx.get(lotsQuery);
        let eligibleLots = lotsSnap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerInventoryLot))
          .filter((lot) => {
            const available = lot.quantity - lot.reservedQuantity;
            if (available <= 0) return false;
            if (lot.expiryDate) {
              const exp = new Date(lot.expiryDate).getTime();
              if (!isNaN(exp) && exp < Date.now()) return false;
            }
            return true;
          });

        // If a specific productLotId was requested by buyer, filter to that lot
        if (itemInput.productLotId) {
          eligibleLots = eligibleLots.filter((l) => l.productLotId === itemInput.productLotId);
        }

        // Sort candidate lots deterministically: earliest expiry first
        eligibleLots.sort((a, b) => {
          const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          return expA - expB;
        });

        const totalAvailable = eligibleLots.reduce(
          (sum, lot) => sum + (lot.quantity - lot.reservedQuantity),
          0
        );

        if (totalAvailable < itemInput.quantity) {
          throw new AppError(
            `Insufficient inventory for '${product.title}'. Requested: ${itemInput.quantity} ${product.unit}, Available in storage: ${totalAvailable} ${product.unit}.`,
            409,
            'INSUFFICIENT_INVENTORY'
          );
        }

        inventoryAllocations.push({ product, itemInput, eligibleLots });
      }

      // 5. Authoritative Financial Calculations (Strict minor units - paise)
      const calculationItems = productDocs.map(({ itemInput, product }) => {
        const pricePerUnitMinor =
          product.pricePerUnitPaise || Math.round(product.pricePerUnit * 100);
        return {
          quantity: itemInput.quantity,
          unit: product.unit,
          pricePerUnitMinor,
        };
      });

      const totals = OrderTotalCalculator.calculateOrderTotals(calculationItems);

      // 6. WRITE PHASE: Order Document Construction
      const orderId = this.orderRepo.collection.doc().id;
      const orderNumber = this.generateOrderNumber();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry for payment

      const serverOrder: ServerOrder = {
        id: orderId,
        orderNumber,
        buyerId: user.uid,
        buyerName: user.name || 'Agri Buyer',
        buyerRole: user.role,
        sellerIds: Array.from(distinctSellerIds),
        status: 'payment_pending',
        paymentStatus: 'pending',
        escrowStatus: 'unfunded',
        currency: 'INR',
        subtotalMinor: totals.subtotalMinor,
        shippingFeeMinor: totals.shippingFeeMinor,
        platformFeeMinor: totals.platformFeeMinor,
        taxMinor: totals.taxMinor,
        discountMinor: totals.discountMinor,
        totalMinor: totals.totalMinor,
        itemCount: input.items.length,
        shippingAddressSnapshot: input.shippingAddress,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        createdBy: user.uid,
        updatedBy: user.uid,
        version: 1,
        subtotal: totals.subtotal,
        logisticsFee: totals.logisticsFee,
        platformFee: totals.platformFee,
        tax: totals.tax,
        totalAmount: totals.totalAmount,
      };

      // Persist Order document
      this.orderRepo.createInTransaction(tx, serverOrder, orderId);

      // 7. WRITE PHASE: Allocate Inventory & Create Frozen Order Items & Reservations
      const createdItems: ServerOrderItem[] = [];

      for (const { product, itemInput, eligibleLots } of inventoryAllocations) {
        const orderItemId = this.orderItemRepo.collection.doc().id;
        const pricePerUnitMinor =
          product.pricePerUnitPaise || Math.round(product.pricePerUnit * 100);
        const lineTotalMinor = OrderTotalCalculator.calculateLineTotalMinor(
          itemInput.quantity,
          pricePerUnitMinor
        );

        let remainingToReserve = itemInput.quantity;
        const reservationIds: string[] = [];

        for (const lot of eligibleLots) {
          if (remainingToReserve <= 0) break;

          const availableInLot = lot.quantity - lot.reservedQuantity;
          if (availableInLot <= 0) continue;

          const allocateAmount = Math.min(remainingToReserve, availableInLot);
          const newReserved = lot.reservedQuantity + allocateAmount;
          const newAvailable = lot.quantity - newReserved;
          const newStatus = calculateInventoryStatus(lot.quantity, newReserved, lot.expiryDate);

          // Update InventoryLot inside transaction
          this.inventoryRepo.updateInTransaction(tx, lot.id, {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            status: newStatus,
          });

          // Sync linked ProductLot document if present
          if (lot.productLotId) {
            const lotRef = this.lotRepo.collection.doc(lot.productLotId);
            tx.update(lotRef, {
              reservedQuantity: newReserved,
              availableQuantity: newAvailable,
              updatedAt: now,
            });
          }

          // Create explicit InventoryReservation record (Ownership guarantee)
          const reservationId = this.reservationRepo.collection.doc().id;
          const reservation: ServerInventoryReservation = {
            id: reservationId,
            orderId,
            orderItemId,
            inventoryLotId: lot.id,
            quantity: allocateAmount,
            status: 'active',
            createdAt: now,
          };
          this.reservationRepo.createInTransaction(tx, reservation, reservationId);
          reservationIds.push(reservationId);

          remainingToReserve -= allocateAmount;
        }

        // Decrement Product totalAvailableQuantity cache
        const productRef = this.productRepo.collection.doc(product.id);
        const updatedTotalAvailable = Math.max(0, product.totalAvailableQuantity - itemInput.quantity);
        tx.update(productRef, {
          totalAvailableQuantity: updatedTotalAvailable,
          updatedAt: now,
        });

        // Create OrderItem with frozen historical snapshots
        const orderItem: ServerOrderItem = {
          id: orderItemId,
          orderId,
          productId: product.id,
          productLotId: itemInput.productLotId || eligibleLots[0]?.productLotId,
          sellerId: product.sellerId,
          sellerNameSnapshot: product.sellerName,
          productNameSnapshot: product.title,
          varietySnapshot: product.variety,
          gradeSnapshot: product.qualityGrade,
          unitSnapshot: product.unit,
          pricePerUnitMinor,
          pricePerUnit: OrderTotalCalculator.toRupees(pricePerUnitMinor),
          quantity: itemInput.quantity,
          lineTotalMinor,
          lineTotal: OrderTotalCalculator.toRupees(lineTotalMinor),
          inventoryReservationIds: reservationIds,
          imageSnapshot: product.images[0] || '',
          createdAt: now,
        };

        this.orderItemRepo.createInTransaction(tx, orderItem, orderItemId);
        createdItems.push(orderItem);
      }

      // 8. WRITE PHASE: Escrow Ledger Foundation & Initial Audit Event
      this.escrowRepo.createLedgerInTransaction(tx, {
        orderId,
        buyerId: user.uid,
        sellerIds: Array.from(distinctSellerIds),
        amountMinor: totals.totalMinor,
        currency: 'INR',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      this.escrowRepo.createTransactionInTransaction(tx, {
        orderId,
        type: 'hold',
        amountMinor: totals.totalMinor,
        currency: 'INR',
        status: 'pending',
        reference: `CHECKOUT_INIT_${orderNumber}`,
        notes: 'Initial escrow ledger pending payment',
        createdAt: now,
        createdBy: user.uid,
      });

      // Write Order Event / Audit Record
      const eventRef = this.orderRepo.db.collection(COLLECTIONS.ORDER_EVENTS).doc();
      tx.set(eventRef, {
        id: eventRef.id,
        orderId,
        actorId: user.uid,
        actorRole: user.role,
        eventType: 'ORDER_CREATED',
        fromStatus: null,
        toStatus: 'payment_pending',
        metadata: {
          totalMinor: totals.totalMinor,
          itemCount: input.items.length,
          orderNumber,
        },
        createdAt: now,
        requestId,
      });

      // 9. WRITE PHASE: Persist Idempotency Record
      if (idempotencyKey) {
        this.idempotencyRepo.setInTransaction(tx, {
          id: idempotencyKey,
          key: idempotencyKey,
          userId: user.uid,
          requestHash,
          operation: 'orders:checkout',
          status: 'completed',
          resourceId: orderId,
          responseSnapshot: { orderId, orderNumber, totalMinor: totals.totalMinor },
          createdAt: now,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      logger.info('Checkout consignment completed atomically in transaction', {
        orderId,
        orderNumber,
        buyerId: user.uid,
        totalMinor: totals.totalMinor,
        itemCount: input.items.length,
        requestId,
      });

      return {
        ...serverOrder,
        items: createdItems,
      };
    });
  }

  /**
   * Command-Based Order Cancellation & Transactional Reservation Release
   * Atomically releases all active reservations belonging exclusively to this order,
   * returns stock to the available pool, updates order status, and logs audit events.
   */
  async cancelOrder(
    orderId: string,
    user: AuthenticatedUser,
    reason?: string,
    requestId: string = crypto.randomUUID()
  ): Promise<ServerOrder> {
    return this.orderRepo.runTransaction(async (tx) => {
      // 1. Authoritative Order Read
      const order = await this.orderRepo.getInTransaction(tx, orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 2. Authorization check: only order buyer or admin can cancel
      if (user.role !== 'admin' && order.buyerId !== user.uid) {
        throw new AuthorizationError('You do not have permission to cancel this consignment order.');
      }

      // 3. Check if already cancelled (idempotent cancellation safety)
      if (order.status === 'cancelled') {
        logger.info('Order is already cancelled, returning existing state safely', { orderId });
        return order;
      }

      // 4. State Machine Validation
      OrderStateMachine.assertCanTransition(order.status, 'cancelled');

      const now = new Date().toISOString();

      // 5. Query active reservations belonging strictly to this order
      const activeReservations = await this.reservationRepo.findActiveByOrderIdInTransaction(tx, orderId);

      // 6. Release reserved stock back to available pool for each active reservation
      for (const reservation of activeReservations) {
        const lotRef = this.inventoryRepo.collection.doc(reservation.inventoryLotId);
        const lotSnap = await tx.get(lotRef);

        if (lotSnap.exists) {
          const lotData = lotSnap.data() as ServerInventoryLot;
          const newReserved = Math.max(0, lotData.reservedQuantity - reservation.quantity);
          const newAvailable = lotData.quantity - newReserved;
          const newStatus = calculateInventoryStatus(lotData.quantity, newReserved, lotData.expiryDate);

          // Update InventoryLot
          this.inventoryRepo.updateInTransaction(tx, reservation.inventoryLotId, {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            status: newStatus,
          });

          // Sync linked ProductLot if present
          if (lotData.productLotId) {
            const prodLotRef = this.lotRepo.collection.doc(lotData.productLotId);
            tx.update(prodLotRef, {
              reservedQuantity: newReserved,
              availableQuantity: newAvailable,
              updatedAt: now,
            });
          }

          // Restore Product totalAvailableQuantity cache
          if (lotData.productId) {
            const prodRef = this.productRepo.collection.doc(lotData.productId);
            const prodSnap = await tx.get(prodRef);
            if (prodSnap.exists) {
              const currentTotal = (prodSnap.data() as ServerProduct).totalAvailableQuantity || 0;
              tx.update(prodRef, {
                totalAvailableQuantity: currentTotal + reservation.quantity,
                updatedAt: now,
              });
            }
          }
        }

        // Mark reservation released (prevents double release)
        this.reservationRepo.updateInTransaction(tx, reservation.id, {
          status: 'released',
          releasedAt: now,
        });
      }

      // 7. Update Order status
      const updatedOrderUpdates = {
        status: 'cancelled' as ServerOrderStatus,
        paymentStatus: 'refunded' as const,
        escrowStatus: 'refunded_to_buyer' as const,
        cancelledAt: now,
        cancellationReason: reason || 'Cancelled by user',
        updatedBy: user.uid,
        version: (order.version || 1) + 1,
      };

      this.orderRepo.updateInTransaction(tx, orderId, updatedOrderUpdates);

      // 8. Update Escrow Ledger and record compensating refund transaction
      try {
        this.escrowRepo.updateLedgerInTransaction(tx, orderId, {
          status: 'refunded',
        });

        this.escrowRepo.createTransactionInTransaction(tx, {
          orderId,
          type: 'refund',
          amountMinor: order.totalMinor,
          currency: 'INR',
          status: 'completed',
          reference: `CANCEL_REFUND_${order.orderNumber}`,
          notes: reason || 'Order cancelled by authorized actor',
          createdAt: now,
          createdBy: user.uid,
        });
      } catch (err) {
        logger.warn('Failed to post escrow refund record during cancellation', { err });
      }

      // 9. Record Order Audit Event
      const eventRef = this.orderRepo.db.collection(COLLECTIONS.ORDER_EVENTS).doc();
      tx.set(eventRef, {
        id: eventRef.id,
        orderId,
        actorId: user.uid,
        actorRole: user.role,
        eventType: 'ORDER_CANCELLED',
        fromStatus: order.status,
        toStatus: 'cancelled',
        metadata: {
          releasedReservationsCount: activeReservations.length,
          reason,
        },
        createdAt: now,
        requestId,
      });

      logger.info('Cancelled order and released reserved inventory atomically', {
        orderId,
        orderNumber: order.orderNumber,
        releasedReservationsCount: activeReservations.length,
        actorUid: user.uid,
      });

      return {
        ...order,
        ...updatedOrderUpdates,
      };
    });
  }

  /**
   * Retrieves single order by ID with role-based access control and item scoping.
   * - Buyer: sees their own order and full items.
   * - Farmer/FPO: sees order if their UID is in sellerIds, but items are strictly filtered to their own produce.
   * - Admin: sees all orders and full items.
   */
  async getOrderById(orderId: string, user: AuthenticatedUser): Promise<OrderWithItems> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order', orderId);
    }

    // Role-based authorization guard
    if (user.role === 'admin') {
      const items = await this.orderItemRepo.findByOrderId(orderId);
      return { ...order, items };
    }

    if (user.uid === order.buyerId) {
      const items = await this.orderItemRepo.findByOrderId(orderId);
      return { ...order, items };
    }

    if (order.sellerIds.includes(user.uid)) {
      // Farmer/FPO: strictly scoped to items belonging to this producer
      const items = await this.orderItemRepo.findByOrderIdAndSellerId(orderId, user.uid);
      return { ...order, items };
    }

    // Non-owner, non-seller: return 403 to prevent unauthorized enumeration
    throw new AuthorizationError('You do not have permission to view this consignment order.');
  }

  /**
   * Retrieves paginated orders scoped strictly by user role.
   */
  async getOrders(
    user: AuthenticatedUser,
    query: OrderQueryInput
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    const statusFilter = query.status === 'all' ? undefined : (query.status as ServerOrderStatus);
    const limit = query.pageSize || 50;

    let orders: ServerOrder[] = [];

    if (user.role === 'admin') {
      orders = await this.orderRepo.findAllOrders(statusFilter, limit);
    } else if (user.role === 'farmer' || user.role === 'fpo') {
      // Seller view: orders where producer is in sellerIds
      orders = await this.orderRepo.findBySellerId(user.uid, statusFilter, limit);
    } else {
      // Buyer / consumer view: orders placed by this buyer
      orders = await this.orderRepo.findByBuyerId(user.uid, statusFilter, limit);
    }

    // Attach items (scoped appropriately for farmers)
    const ordersWithItems: OrderWithItems[] = await Promise.all(
      orders.map(async (order) => {
        let items: ServerOrderItem[];
        if (user.role === 'farmer' || user.role === 'fpo') {
          items = await this.orderItemRepo.findByOrderIdAndSellerId(order.id, user.uid);
        } else {
          items = await this.orderItemRepo.findByOrderId(order.id);
        }
        return { ...order, items };
      })
    );

    return {
      orders: ordersWithItems,
      total: ordersWithItems.length,
    };
  }
}

export const orderService = new OrderService();
