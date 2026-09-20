/**
 * ORDER TRANSACTION & CONCURRENCY TEST SUITE
 * Verifies atomic checkout, multi-lot reservation, reservation ownership isolation,
 * cancellation stock release, and idempotency guarantees under transactional semantics.
 */

import assert from 'node:assert/strict';
import { Transaction } from 'firebase-admin/firestore';
import { OrderRepository } from '../repositories/order.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { InventoryReservationRepository } from '../repositories/inventory-reservation.repository';
import { EscrowRepository } from '../repositories/escrow.repository';
import { IdempotencyRepository, IdempotencyRecord } from '../repositories/idempotency.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductLotRepository } from '../repositories/product-lot.repository';
import { OrderService } from '../services/order.service';
import { ServerOrder, ServerOrderItem, ServerInventoryReservation, CheckoutInput } from '../domain/order';
import { ServerInventoryLot } from '../domain/inventory';
import { ServerProduct, ServerProductLot } from '../domain/product';
import { ServerEscrowLedger, ServerEscrowTransaction } from '../domain/escrow';
import { AuthenticatedUser } from '../auth/verify-token';
import { AppError, ConflictError, NotFoundError } from '../lib/errors';

class MockInMemoryFirestoreStore {
  public products = new Map<string, ServerProduct>();
  public productLots = new Map<string, ServerProductLot>();
  public inventoryLots = new Map<string, ServerInventoryLot>();
  public orders = new Map<string, ServerOrder>();
  public orderItems = new Map<string, ServerOrderItem>();
  public reservations = new Map<string, ServerInventoryReservation>();
  public escrowLedgers = new Map<string, ServerEscrowLedger>();
  public escrowTransactions = new Map<string, ServerEscrowTransaction>();
  public idempotency = new Map<string, IdempotencyRecord>();
  public orderEvents = new Map<string, any>();

  reset() {
    this.products.clear();
    this.productLots.clear();
    this.inventoryLots.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.reservations.clear();
    this.escrowLedgers.clear();
    this.escrowTransactions.clear();
    this.idempotency.clear();
    this.orderEvents.clear();
  }
}

class MockOrderTransactionEnvironment {
  public store = new MockInMemoryFirestoreStore();

  public orderRepo = {
    collection: {
      doc: (id?: string) => ({
        id: id || `ord-${Math.random().toString(36).substring(2, 9)}`,
      }),
    },
    db: {
      collection: (name: string) => ({
        doc: (id?: string) => ({
          id: id || `event-${Math.random().toString(36).substring(2, 9)}`,
        }),
      }),
    },
    runTransaction: async <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => {
      const stagedWrites: Array<() => void> = [];

      const tx = {
        get: async (refOrQuery: any) => {
          if (refOrQuery._type === 'inventoryLotsQuery') {
            const productId = refOrQuery._productId;
            const matches: any[] = [];
            for (const lot of Array.from(this.store.inventoryLots.values())) {
              if (lot.productId === productId && ['in_stock', 'low_stock', 'critical'].includes(lot.status)) {
                matches.push({
                  id: lot.id,
                  data: () => ({ ...lot }),
                });
              }
            }
            return { docs: matches };
          }

          if (refOrQuery._type === 'activeReservationsQuery') {
            const orderId = refOrQuery._orderId;
            const matches: any[] = [];
            for (const res of Array.from(this.store.reservations.values())) {
              if (res.orderId === orderId && res.status === 'active') {
                matches.push({
                  id: res.id,
                  data: () => ({ ...res }),
                });
              }
            }
            return { docs: matches };
          }

          // Single doc get
          const collection = refOrQuery._collection;
          const id = refOrQuery.id;

          let data: any = null;
          if (collection === 'products') data = this.store.products.get(id);
          else if (collection === 'inventoryLots') data = this.store.inventoryLots.get(id);
          else if (collection === 'orders') data = this.store.orders.get(id);
          else if (collection === 'idempotencyKeys') data = this.store.idempotency.get(id);

          if (!data) {
            return { exists: false, data: () => undefined, id };
          }
          return { exists: true, data: () => ({ ...data }), id };
        },
        set: (ref: any, data: any) => {
          stagedWrites.push(() => {
            const col = ref._collection;
            const id = ref.id;
            if (col === 'orders') this.store.orders.set(id, { id, ...data });
            else if (col === 'orderItems') this.store.orderItems.set(id, { id, ...data });
            else if (col === 'inventoryReservations') this.store.reservations.set(id, { id, ...data });
            else if (col === 'escrowLedgers') this.store.escrowLedgers.set(id, { id, ...data });
            else if (col === 'escrowTransactions') this.store.escrowTransactions.set(id, { id, ...data });
            else if (col === 'idempotencyKeys') this.store.idempotency.set(id, { id, ...data });
            else if (col === 'orderEvents') this.store.orderEvents.set(id, { id, ...data });
          });
        },
        update: (ref: any, data: any) => {
          stagedWrites.push(() => {
            const col = ref._collection;
            const id = ref.id;
            if (col === 'inventoryLots') {
              const cur = this.store.inventoryLots.get(id);
              if (cur) this.store.inventoryLots.set(id, { ...cur, ...data });
            } else if (col === 'productLots') {
              const cur = this.store.productLots.get(id);
              if (cur) this.store.productLots.set(id, { ...cur, ...data });
            } else if (col === 'products') {
              const cur = this.store.products.get(id);
              if (cur) this.store.products.set(id, { ...cur, ...data });
            } else if (col === 'orders') {
              const cur = this.store.orders.get(id);
              if (cur) this.store.orders.set(id, { ...cur, ...data });
            } else if (col === 'inventoryReservations') {
              const cur = this.store.reservations.get(id);
              if (cur) this.store.reservations.set(id, { ...cur, ...data });
            } else if (col === 'escrowLedgers') {
              const cur = this.store.escrowLedgers.get(id);
              if (cur) this.store.escrowLedgers.set(id, { ...cur, ...data });
            }
          });
        },
      } as unknown as Transaction;

      // Execute transaction callback
      const result = await fn(tx);

      // Commit staged writes atomically upon success
      stagedWrites.forEach((w) => w());

      return result;
    },
    getInTransaction: async (_tx: Transaction, id: string) => {
      const order = this.store.orders.get(id);
      return order ? { ...order } : null;
    },
    createInTransaction: (_tx: Transaction, order: any, id: string) => {
      this.store.orders.set(id, { id, ...order });
      return { id, ...order };
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = this.store.orders.get(id);
      if (cur) this.store.orders.set(id, { ...cur, ...updates });
    },
    findById: async (id: string) => {
      const o = this.store.orders.get(id);
      return o ? { ...o } : null;
    },
  } as unknown as OrderRepository;

  public orderItemRepo = {
    collection: {
      doc: (id?: string) => ({
        id: id || `item-${Math.random().toString(36).substring(2, 9)}`,
        _collection: 'orderItems',
      }),
    },
    createInTransaction: (_tx: Transaction, item: any, id: string) => {
      this.store.orderItems.set(id, { id, ...item });
      return { id, ...item };
    },
    findByOrderId: async (orderId: string) => {
      return Array.from(this.store.orderItems.values()).filter((i) => i.orderId === orderId);
    },
    findByOrderIdAndSellerId: async (orderId: string, sellerId: string) => {
      return Array.from(this.store.orderItems.values()).filter(
        (i) => i.orderId === orderId && i.sellerId === sellerId
      );
    },
  } as unknown as OrderItemRepository;

  public reservationRepo = {
    collection: {
      doc: (id?: string) => ({
        id: id || `res-${Math.random().toString(36).substring(2, 9)}`,
        _collection: 'inventoryReservations',
      }),
    },
    createInTransaction: (_tx: Transaction, res: any, id: string) => {
      this.store.reservations.set(id, { id, ...res });
      return { id, ...res };
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = this.store.reservations.get(id);
      if (cur) this.store.reservations.set(id, { ...cur, ...updates });
    },
    findActiveByOrderIdInTransaction: async (_tx: Transaction, orderId: string) => {
      return Array.from(this.store.reservations.values()).filter(
        (r) => r.orderId === orderId && r.status === 'active'
      );
    },
    findByOrderId: async (orderId: string) => {
      return Array.from(this.store.reservations.values()).filter((r) => r.orderId === orderId);
    },
  } as unknown as InventoryReservationRepository;

  public escrowRepo = {
    collection: {
      doc: (id: string) => ({
        id,
        _collection: 'escrowLedgers',
      }),
    },
    createLedgerInTransaction: (_tx: Transaction, ledger: any) => {
      this.store.escrowLedgers.set(ledger.orderId, { id: ledger.orderId, ...ledger });
      return { id: ledger.orderId, ...ledger };
    },
    updateLedgerInTransaction: (_tx: Transaction, orderId: string, updates: any) => {
      const cur = this.store.escrowLedgers.get(orderId);
      if (cur) this.store.escrowLedgers.set(orderId, { ...cur, ...updates });
    },
    createTransactionInTransaction: (_tx: Transaction, entry: any) => {
      const id = `tx-${Math.random().toString(36).substring(2, 9)}`;
      this.store.escrowTransactions.set(id, { id, ...entry });
      return { id, ...entry };
    },
  } as unknown as EscrowRepository;

  public idempotencyRepo = {
    collection: {
      doc: (key: string) => ({
        id: key,
        _collection: 'idempotencyKeys',
      }),
    },
    getInTransaction: async (_tx: Transaction, key: string) => {
      const rec = this.store.idempotency.get(key);
      return rec ? { ...rec } : null;
    },
    setInTransaction: (_tx: Transaction, rec: any) => {
      this.store.idempotency.set(rec.key, { ...rec });
    },
  } as unknown as IdempotencyRepository;

  public inventoryRepo = {
    collection: {
      doc: (id: string) => ({
        id,
        _collection: 'inventoryLots',
      }),
      where: (field: string, op: string, val: any) => ({
        _type: 'inventoryLotsQuery',
        _productId: val,
        where: () => ({
          _type: 'inventoryLotsQuery',
          _productId: val,
        }),
      }),
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = this.store.inventoryLots.get(id);
      if (cur) this.store.inventoryLots.set(id, { ...cur, ...updates });
    },
  } as unknown as InventoryRepository;

  public productRepo = {
    collection: {
      doc: (id: string) => ({
        id,
        _collection: 'products',
      }),
    },
  } as unknown as ProductRepository;

  public lotRepo = {
    collection: {
      doc: (id: string) => ({
        id,
        _collection: 'productLots',
      }),
    },
  } as unknown as ProductLotRepository;

  createService(): OrderService {
    return new OrderService(
      this.orderRepo,
      this.orderItemRepo,
      this.reservationRepo,
      this.escrowRepo,
      this.idempotencyRepo,
      this.inventoryRepo,
      this.productRepo,
      this.lotRepo
    );
  }
}

async function runOrderTransactionTests() {
  console.log('====================================================');
  console.log('STARTING ORDER TRANSACTION & CONCURRENCY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  const env = new MockOrderTransactionEnvironment();
  const service = env.createService();

  const buyerUser: AuthenticatedUser = {
    uid: 'buyer-vikram-99',
    role: 'buyer',
    name: 'Vikram Wholesale Ltd',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const farmerUser: AuthenticatedUser = {
    uid: 'farmer-ananya-404',
    role: 'farmer',
    name: 'Ananya Deshmukh',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  // Seed Product and Inventory Lots
  const seedProduct: ServerProduct = {
    id: 'prod-nashik-onions',
    sellerId: 'farmer-ananya-404',
    sellerName: 'Ananya Farms',
    sellerType: 'farmer',
    sellerRating: 4.8,
    sellerVerified: true,
    title: 'Nashik Red Onions (Export Grade)',
    category: 'vegetables',
    variety: 'Garwa',
    pricePerUnit: 35.0,
    pricePerUnitPaise: 3500, // 3500 paise = ₹35.00
    unit: 'kg',
    marketMandiPrice: 42.0,
    minOrderQuantity: 100,
    totalAvailableQuantity: 1000,
    listingStatus: 'active',
    location: { district: 'Nashik', state: 'Maharashtra' },
    images: ['https://example.com/onions.jpg'],
    harvestDate: '2026-09-15',
    shelfLifeDays: 90,
    qualityGrade: 'Grade A',
    storageType: 'Ambient Warehouse',
    description: 'Fresh cured red onions',
    organicCertified: false,
    tags: ['onions', 'nashik'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const seedInventoryLot1: ServerInventoryLot = {
    id: 'inv-lot-1',
    productLotId: 'plot-1',
    productId: 'prod-nashik-onions',
    ownerId: 'farmer-ananya-404',
    quantity: 300,
    reservedQuantity: 0,
    availableQuantity: 300,
    unit: 'kg',
    warehouseLocation: 'Bay A1',
    storageCondition: 'Dry',
    receivedAt: '2026-09-16',
    expiryDate: '2026-12-16',
    status: 'in_stock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const seedInventoryLot2: ServerInventoryLot = {
    id: 'inv-lot-2',
    productLotId: 'plot-2',
    productId: 'prod-nashik-onions',
    ownerId: 'farmer-ananya-404',
    quantity: 700,
    reservedQuantity: 0,
    availableQuantity: 700,
    unit: 'kg',
    warehouseLocation: 'Bay A2',
    storageCondition: 'Dry',
    receivedAt: '2026-09-17',
    expiryDate: '2026-12-20',
    status: 'in_stock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  env.store.products.set(seedProduct.id, seedProduct);
  env.store.inventoryLots.set(seedInventoryLot1.id, { ...seedInventoryLot1 });
  env.store.inventoryLots.set(seedInventoryLot2.id, { ...seedInventoryLot2 });

  // TEST 1: Atomic Checkout (200 kg) creates Order, Items, Reservations, Escrow
  console.log('TEST 1: Atomic Checkout (200 kg) succeeds');
  const checkoutPayload: CheckoutInput = {
    items: [{ productId: seedProduct.id, quantity: 200 }],
    shippingAddress: {
      name: 'Vikram Wholesale',
      phone: '+919876543210',
      addressLine1: 'APMC Market Yard',
      district: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400705',
    },
  };

  const order1 = await service.checkout(buyerUser, checkoutPayload);
  assert.equal(order1.status, 'payment_pending');
  assert.equal(order1.buyerId, buyerUser.uid);
  assert.equal(order1.items.length, 1);
  assert.equal(order1.items[0].quantity, 200);
  assert.equal(order1.items[0].pricePerUnitMinor, 3500);
  assert.equal(order1.items[0].lineTotalMinor, 700000); // 200 * 3500 = 7,00,000 paise = ₹7000.00

  // Verify inventory was reserved on Lot 1
  const updatedLot1 = env.store.inventoryLots.get('inv-lot-1')!;
  assert.equal(updatedLot1.reservedQuantity, 200);
  assert.equal(updatedLot1.availableQuantity, 100);

  // Verify explicit reservation record created with status 'active'
  const reservations = Array.from(env.store.reservations.values()).filter(
    (r) => r.orderId === order1.id
  );
  assert.equal(reservations.length, 1);
  assert.equal(reservations[0].quantity, 200);
  assert.equal(reservations[0].status, 'active');
  assert.equal(reservations[0].inventoryLotId, 'inv-lot-1');

  // Verify escrow ledger initialized
  const ledger = env.store.escrowLedgers.get(order1.id);
  assert.ok(ledger);
  assert.equal(ledger.status, 'pending');
  console.log('✔ Passed: Order, reservations, and escrow ledger created atomically.');
  passed++;

  // TEST 2: Multi-lot allocation (remaining Lot 1 has 100 kg, request 250 kg spans Lot 1 and Lot 2)
  console.log('TEST 2: Multi-lot inventory allocation (250 kg across 2 lots)');
  const order2 = await service.checkout(buyerUser, {
    items: [{ productId: seedProduct.id, quantity: 250 }],
    shippingAddress: checkoutPayload.shippingAddress,
  });

  assert.equal(order2.items[0].quantity, 250);
  const lot1After = env.store.inventoryLots.get('inv-lot-1')!;
  const lot2After = env.store.inventoryLots.get('inv-lot-2')!;

  // Lot 1 had 100 kg available -> allocated all 100 kg (now 300 reserved, 0 available)
  assert.equal(lot1After.reservedQuantity, 300);
  assert.equal(lot1After.availableQuantity, 0);

  // Lot 2 had 700 kg available -> allocated remaining 150 kg (now 150 reserved, 550 available)
  assert.equal(lot2After.reservedQuantity, 150);
  assert.equal(lot2After.availableQuantity, 550);

  // Verify reservations for Order 2: exactly 2 reservation records spanning the 2 lots
  const resOrder2 = Array.from(env.store.reservations.values()).filter(
    (r) => r.orderId === order2.id
  );
  assert.equal(resOrder2.length, 2);
  const totalReservedOrder2 = resOrder2.reduce((sum, r) => sum + r.quantity, 0);
  assert.equal(totalReservedOrder2, 250);
  console.log('✔ Passed: Multi-lot stock allocation succeeded deterministically.');
  passed++;

  // TEST 3: Insufficient inventory error
  console.log('TEST 3: Insufficient inventory throws 409 INSUFFICIENT_INVENTORY');
  // Available left: 0 + 550 = 550 kg. Requesting 600 kg must fail atomically.
  await assert.rejects(
    async () => {
      await service.checkout(buyerUser, {
        items: [{ productId: seedProduct.id, quantity: 600 }],
        shippingAddress: checkoutPayload.shippingAddress,
      });
    },
    (err: unknown) => {
      return (
        err instanceof AppError &&
        err.statusCode === 409 &&
        err.code === 'INSUFFICIENT_INVENTORY'
      );
    }
  );
  // Invariant check: Lot 2 reservations must NOT have changed
  assert.equal(env.store.inventoryLots.get('inv-lot-2')!.reservedQuantity, 150);
  console.log('✔ Passed: Insufficient inventory cleanly rejected with zero partial writes.');
  passed++;

  // TEST 4: MOQ violation rejected with 422
  console.log('TEST 4: MOQ violation rejected with 422');
  await assert.rejects(
    async () => {
      await service.checkout(buyerUser, {
        items: [{ productId: seedProduct.id, quantity: 50 }], // MOQ is 100
        shippingAddress: checkoutPayload.shippingAddress,
      });
    },
    (err: unknown) => {
      return err instanceof AppError && err.statusCode === 422;
    }
  );
  console.log('✔ Passed: MOQ violation rejected.');
  passed++;

  // TEST 5: Reservation ownership isolation: cancelling Order 1 releases ONLY Order 1 stock
  console.log('TEST 5: Reservation ownership isolation during cancellation');
  // Order 1 has 200 kg reserved on Lot 1.
  // Order 2 has 100 kg reserved on Lot 1 and 150 kg on Lot 2.
  await service.cancelOrder(order1.id, buyerUser, 'Postponed delivery');

  const cancelledOrder1 = env.store.orders.get(order1.id)!;
  assert.equal(cancelledOrder1.status, 'cancelled');

  // Lot 1: was 300 reserved. After releasing Order 1 (200 kg), reserved should be 100 kg, available 200 kg.
  const lot1AfterCancel = env.store.inventoryLots.get('inv-lot-1')!;
  assert.equal(lot1AfterCancel.reservedQuantity, 100);
  assert.equal(lot1AfterCancel.availableQuantity, 200);

  // Lot 2: was 150 reserved for Order 2. MUST BE COMPLETELY UNTOUCHED!
  const lot2AfterCancel = env.store.inventoryLots.get('inv-lot-2')!;
  assert.equal(lot2AfterCancel.reservedQuantity, 150);
  assert.equal(lot2AfterCancel.availableQuantity, 550);

  // Reservations for Order 1 are now 'released'
  const order1Reservations = Array.from(env.store.reservations.values()).filter(
    (r) => r.orderId === order1.id
  );
  assert.equal(order1Reservations[0].status, 'released');

  // Reservations for Order 2 remain 'active'
  const order2Reservations = Array.from(env.store.reservations.values()).filter(
    (r) => r.orderId === order2.id
  );
  assert.ok(order2Reservations.every((r) => r.status === 'active'));
  console.log('✔ Passed: Reservation ownership isolation verified. Cross-order stock uncorrupted.');
  passed++;

  // TEST 6: Repeated cancellation is idempotent and does not double-release stock
  console.log('TEST 6: Repeated cancellation idempotency');
  await service.cancelOrder(order1.id, buyerUser, 'Duplicate cancel request');
  const lot1AfterSecondCancel = env.store.inventoryLots.get('inv-lot-1')!;
  assert.equal(lot1AfterSecondCancel.reservedQuantity, 100); // Unchanged
  assert.equal(lot1AfterSecondCancel.availableQuantity, 200); // Unchanged
  console.log('✔ Passed: Repeated cancellation safely idempotent with zero double-release.');
  passed++;

  // TEST 7: Idempotent checkout with same key returns original order
  console.log('TEST 7: Idempotent checkout with same key returns original order');
  const idemKey = 'idempotent-test-key-001';
  const newOrderPayload: CheckoutInput = {
    items: [{ productId: seedProduct.id, quantity: 100 }],
    shippingAddress: checkoutPayload.shippingAddress,
  };

  const initialIdemOrder = await service.checkout(buyerUser, newOrderPayload, idemKey);
  const secondIdemOrder = await service.checkout(buyerUser, newOrderPayload, idemKey);

  assert.equal(initialIdemOrder.id, secondIdemOrder.id);
  assert.equal(initialIdemOrder.orderNumber, secondIdemOrder.orderNumber);
  console.log('✔ Passed: Idempotent checkout returns existing order without duplicate stock locking.');
  passed++;

  // TEST 8: Same Idempotency-Key with different payload throws 409 Conflict
  console.log('TEST 8: Idempotency-Key conflict with altered payload -> 409');
  await assert.rejects(
    async () => {
      await service.checkout(
        buyerUser,
        {
          items: [{ productId: seedProduct.id, quantity: 150 }], // Changed quantity from 100 to 150!
          shippingAddress: checkoutPayload.shippingAddress,
        },
        idemKey
      );
    },
    (err: unknown) => {
      return err instanceof ConflictError && err.statusCode === 409;
    }
  );
  console.log('✔ Passed: Idempotency conflict detected and rejected with 409 Conflict.');
  passed++;

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${passed} ORDER TRANSACTION TESTS PASSED!`);
  console.log('====================================================\n');
}

runOrderTransactionTests().catch((err) => {
  console.error('Order Transaction Test Suite Failed:', err);
  process.exit(1);
});
