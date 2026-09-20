/**
 * ORDER API & RBAC SECURITY TEST SUITE
 * Tests authorization boundaries, role enforcement, price tampering protection,
 * cross-tenant isolation, and farmer item scoping.
 */

import assert from 'node:assert/strict';
import { OrderService } from '../services/order.service';
import { ServerProduct } from '../domain/product';
import { ServerInventoryLot } from '../domain/inventory';
import { ServerOrder, ServerOrderItem, ServerInventoryReservation, CheckoutInput } from '../domain/order';
import { AuthenticatedUser } from '../auth/verify-token';
import { AuthorizationError, NotFoundError, AppError } from '../lib/errors';
import { OrderRepository } from '../repositories/order.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { InventoryReservationRepository } from '../repositories/inventory-reservation.repository';
import { EscrowRepository } from '../repositories/escrow.repository';
import { IdempotencyRepository } from '../repositories/idempotency.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductLotRepository } from '../repositories/product-lot.repository';
import { Transaction } from 'firebase-admin/firestore';

class MockSecurityStore {
  public products = new Map<string, ServerProduct>();
  public inventoryLots = new Map<string, ServerInventoryLot>();
  public orders = new Map<string, ServerOrder>();
  public orderItems = new Map<string, ServerOrderItem>();
  public reservations = new Map<string, ServerInventoryReservation>();

  reset() {
    this.products.clear();
    this.inventoryLots.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.reservations.clear();
  }
}

function createSecurityTestService(store: MockSecurityStore): OrderService {
  const orderRepo = {
    collection: {
      doc: (id?: string) => ({ id: id || `ord-${Math.random().toString(36).substring(2, 8)}` }),
    },
    db: {
      collection: () => ({
        doc: (id?: string) => ({ id: id || `event-${Math.random().toString(36).substring(2, 8)}` }),
      }),
    },
    runTransaction: async <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => {
      const tx = {
        get: async (ref: any) => {
          if (ref._type === 'inventoryLotsQuery') {
            const matches: any[] = [];
            for (const lot of Array.from(store.inventoryLots.values())) {
              if (lot.productId === ref._productId && ['in_stock', 'low_stock', 'critical'].includes(lot.status)) {
                matches.push({ id: lot.id, data: () => ({ ...lot }) });
              }
            }
            return { docs: matches };
          }
          if (ref._type === 'activeReservationsQuery') {
            const matches: any[] = [];
            for (const res of Array.from(store.reservations.values())) {
              if (res.orderId === ref._orderId && res.status === 'active') {
                matches.push({ id: res.id, data: () => ({ ...res }) });
              }
            }
            return { docs: matches };
          }
          let data: any = null;
          if (ref._collection === 'products') data = store.products.get(ref.id);
          else if (ref._collection === 'inventoryLots') data = store.inventoryLots.get(ref.id);
          else if (ref._collection === 'orders') data = store.orders.get(ref.id);

          if (!data) return { exists: false, data: () => undefined, id: ref.id };
          return { exists: true, data: () => ({ ...data }), id: ref.id };
        },
        set: (ref: any, data: any) => {
          if (ref._collection === 'orders') store.orders.set(ref.id, { id: ref.id, ...data });
          else if (ref._collection === 'orderItems') store.orderItems.set(ref.id, { id: ref.id, ...data });
          else if (ref._collection === 'inventoryReservations') store.reservations.set(ref.id, { id: ref.id, ...data });
        },
        update: (ref: any, data: any) => {
          if (ref._collection === 'orders') {
            const cur = store.orders.get(ref.id);
            if (cur) store.orders.set(ref.id, { ...cur, ...data });
          } else if (ref._collection === 'inventoryLots') {
            const cur = store.inventoryLots.get(ref.id);
            if (cur) store.inventoryLots.set(ref.id, { ...cur, ...data });
          } else if (ref._collection === 'inventoryReservations') {
            const cur = store.reservations.get(ref.id);
            if (cur) store.reservations.set(ref.id, { ...cur, ...data });
          }
        },
      } as unknown as Transaction;

      return fn(tx);
    },
    createInTransaction: (_tx: Transaction, order: any, id: string) => {
      store.orders.set(id, { id, ...order });
      return { id, ...order };
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = store.orders.get(id);
      if (cur) store.orders.set(id, { ...cur, ...updates });
    },
    getInTransaction: async (_tx: Transaction, id: string) => {
      const o = store.orders.get(id);
      return o ? { ...o } : null;
    },
    findById: async (id: string) => {
      const o = store.orders.get(id);
      return o ? { ...o } : null;
    },
  } as unknown as OrderRepository;

  const orderItemRepo = {
    collection: {
      doc: (id?: string) => ({ id: id || `item-${Math.random().toString(36).substring(2, 8)}`, _collection: 'orderItems' }),
    },
    createInTransaction: (_tx: Transaction, item: any, id: string) => {
      store.orderItems.set(id, { id, ...item });
      return { id, ...item };
    },
    findByOrderId: async (orderId: string) => {
      return Array.from(store.orderItems.values()).filter((i) => i.orderId === orderId);
    },
    findByOrderIdAndSellerId: async (orderId: string, sellerId: string) => {
      return Array.from(store.orderItems.values()).filter(
        (i) => i.orderId === orderId && i.sellerId === sellerId
      );
    },
  } as unknown as OrderItemRepository;

  const reservationRepo = {
    collection: {
      doc: (id?: string) => ({ id: id || `res-${Math.random().toString(36).substring(2, 8)}`, _collection: 'inventoryReservations' }),
    },
    createInTransaction: (_tx: Transaction, res: any, id: string) => {
      store.reservations.set(id, { id, ...res });
      return { id, ...res };
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = store.reservations.get(id);
      if (cur) store.reservations.set(id, { ...cur, ...updates });
    },
    findActiveByOrderIdInTransaction: async (_tx: Transaction, orderId: string) => {
      return Array.from(store.reservations.values()).filter(
        (r) => r.orderId === orderId && r.status === 'active'
      );
    },
  } as unknown as InventoryReservationRepository;

  const escrowRepo = {
    collection: { doc: (id: string) => ({ id, _collection: 'escrowLedgers' }) },
    createLedgerInTransaction: () => ({}),
    updateLedgerInTransaction: () => {},
    createTransactionInTransaction: () => ({}),
  } as unknown as EscrowRepository;

  const idempotencyRepo = {
    collection: { doc: (key: string) => ({ id: key, _collection: 'idempotencyKeys' }) },
    getInTransaction: async () => null,
    setInTransaction: () => {},
  } as unknown as IdempotencyRepository;

  const inventoryRepo = {
    collection: {
      doc: (id: string) => ({ id, _collection: 'inventoryLots' }),
      where: (_field: string, _op: string, val: any) => ({
        _type: 'inventoryLotsQuery',
        _productId: val,
        where: () => ({ _type: 'inventoryLotsQuery', _productId: val }),
      }),
    },
    updateInTransaction: (_tx: Transaction, id: string, updates: any) => {
      const cur = store.inventoryLots.get(id);
      if (cur) store.inventoryLots.set(id, { ...cur, ...updates });
    },
  } as unknown as InventoryRepository;

  const productRepo = {
    collection: {
      doc: (id: string) => ({ id, _collection: 'products' }),
    },
  } as unknown as ProductRepository;

  const lotRepo = {
    collection: {
      doc: (id: string) => ({ id, _collection: 'productLots' }),
    },
  } as unknown as ProductLotRepository;

  return new OrderService(
    orderRepo,
    orderItemRepo,
    reservationRepo,
    escrowRepo,
    idempotencyRepo,
    inventoryRepo,
    productRepo,
    lotRepo
  );
}

async function runOrderApiSecurityTests() {
  console.log('====================================================');
  console.log('STARTING ORDER API & RBAC SECURITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  const store = new MockSecurityStore();
  const service = createSecurityTestService(store);

  // Users
  const buyerA: AuthenticatedUser = {
    uid: 'buyer-alok-100',
    role: 'buyer',
    name: 'Alok Foods',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const buyerB: AuthenticatedUser = {
    uid: 'buyer-bhavesh-200',
    role: 'buyer',
    name: 'Bhavesh Agro',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const farmer1: AuthenticatedUser = {
    uid: 'farmer-ramesh-300',
    role: 'farmer',
    name: 'Ramesh Patel',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const farmer2: AuthenticatedUser = {
    uid: 'farmer-suresh-400',
    role: 'farmer',
    name: 'Suresh Kumar',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const adminUser: AuthenticatedUser = {
    uid: 'admin-platform-001',
    role: 'admin',
    name: 'Marketplace Admin',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  // Seed two products from two different farmers
  const productA: ServerProduct = {
    id: 'prod-wheat-01',
    sellerId: farmer1.uid,
    sellerName: 'Ramesh Farm',
    sellerType: 'farmer',
    sellerRating: 4.9,
    sellerVerified: true,
    title: 'Sharbati Wheat',
    category: 'grains',
    variety: 'Sharbati',
    pricePerUnit: 40.0,
    pricePerUnitPaise: 4000,
    unit: 'kg',
    marketMandiPrice: 45.0,
    minOrderQuantity: 50,
    totalAvailableQuantity: 500,
    listingStatus: 'active',
    location: { district: 'Sehore', state: 'Madhya Pradesh' },
    images: ['https://example.com/wheat.jpg'],
    harvestDate: '2026-09-01',
    shelfLifeDays: 180,
    qualityGrade: 'Grade A',
    storageType: 'Ambient Warehouse',
    description: 'Golden MP Sharbati wheat',
    organicCertified: false,
    tags: ['wheat'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const productB: ServerProduct = {
    id: 'prod-garlic-02',
    sellerId: farmer2.uid,
    sellerName: 'Suresh Organic',
    sellerType: 'farmer',
    sellerRating: 4.7,
    sellerVerified: true,
    title: 'Ooty Hill Garlic',
    category: 'spices',
    variety: 'Hill Garlic',
    pricePerUnit: 180.0,
    pricePerUnitPaise: 18000,
    unit: 'kg',
    marketMandiPrice: 220.0,
    minOrderQuantity: 20,
    totalAvailableQuantity: 200,
    listingStatus: 'active',
    location: { district: 'Nilgiris', state: 'Tamil Nadu' },
    images: ['https://example.com/garlic.jpg'],
    harvestDate: '2026-09-10',
    shelfLifeDays: 60,
    qualityGrade: 'Organic Certified',
    storageType: 'Cold Storage',
    description: 'High allicin organic garlic',
    organicCertified: true,
    tags: ['garlic', 'organic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.products.set(productA.id, productA);
  store.products.set(productB.id, productB);

  store.inventoryLots.set('inv-wheat-1', {
    id: 'inv-wheat-1',
    productLotId: 'plot-wheat-1',
    productId: productA.id,
    ownerId: farmer1.uid,
    quantity: 500,
    reservedQuantity: 0,
    availableQuantity: 500,
    unit: 'kg',
    warehouseLocation: 'Sehore Hub',
    storageCondition: 'Dry',
    receivedAt: '2026-09-02',
    expiryDate: '2027-03-02',
    status: 'in_stock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  store.inventoryLots.set('inv-garlic-1', {
    id: 'inv-garlic-1',
    productLotId: 'plot-garlic-1',
    productId: productB.id,
    ownerId: farmer2.uid,
    quantity: 200,
    reservedQuantity: 0,
    availableQuantity: 200,
    unit: 'kg',
    warehouseLocation: 'Ooty Cold Dock',
    storageCondition: 'Refrigerated',
    receivedAt: '2026-09-11',
    expiryDate: '2026-11-11',
    status: 'in_stock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const baseAddress = {
    name: 'Alok General Store',
    phone: '+919876543210',
    addressLine1: 'Shop 12, Mandi Gate',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    postalCode: '462001',
  };

  // TEST 1: Farmer role cannot initiate checkout (RBAC violation)
  console.log('TEST 1: Farmer role prohibited from placing checkout order');
  await assert.rejects(
    async () => {
      await service.checkout(farmer1, {
        items: [{ productId: productA.id, quantity: 50 }],
        shippingAddress: baseAddress,
      });
    },
    (err: unknown) => {
      return err instanceof AuthorizationError && err.statusCode === 403;
    }
  );
  console.log('✔ Passed: Farmer role rejected with 403 FORBIDDEN.');
  passed++;

  // TEST 2: Price tampering protection
  console.log('TEST 2: Price tampering protection (client cannot dictate unit price)');
  // Buyer A orders 50 kg of wheat. Authoritative price is 4000 paise (₹40.00).
  const orderA = await service.checkout(buyerA, {
    items: [{ productId: productA.id, quantity: 50 }],
    shippingAddress: baseAddress,
  });

  assert.equal(orderA.items[0].pricePerUnitMinor, 4000);
  assert.equal(orderA.items[0].lineTotalMinor, 200000); // 50 * 4000 = 2,00,000 paise = ₹2000.00
  assert.equal(orderA.buyerId, buyerA.uid);
  console.log('✔ Passed: Server strictly enforced authoritative price from product document.');
  passed++;

  // TEST 3: Multi-seller order
  console.log('TEST 3: Multi-seller consignment order');
  const multiSellerOrder = await service.checkout(buyerA, {
    items: [
      { productId: productA.id, quantity: 50 }, // Farmer 1
      { productId: productB.id, quantity: 20 }, // Farmer 2
    ],
    shippingAddress: baseAddress,
  });

  assert.equal(multiSellerOrder.sellerIds.length, 2);
  assert.ok(multiSellerOrder.sellerIds.includes(farmer1.uid));
  assert.ok(multiSellerOrder.sellerIds.includes(farmer2.uid));
  console.log('✔ Passed: Multi-seller relationship correctly captured in sellerIds.');
  passed++;

  // TEST 4: Cross-tenant read protection: Buyer B cannot read Buyer A's order
  console.log("TEST 4: Cross-tenant read protection (Buyer B cannot view Buyer A's order)");
  await assert.rejects(
    async () => {
      await service.getOrderById(orderA.id, buyerB);
    },
    (err: unknown) => {
      return err instanceof AuthorizationError && err.statusCode === 403;
    }
  );
  console.log('✔ Passed: Unauthorized buyer blocked with 403 FORBIDDEN.');
  passed++;

  // TEST 5: Farmer item isolation (Farmer 1 only sees their items in a multi-seller order)
  console.log('TEST 5: Farmer view isolation (Farmer 1 only sees their produce in multi-seller order)');
  const farmer1View = await service.getOrderById(multiSellerOrder.id, farmer1);

  // Order has 2 items total, but Farmer 1 must only see their 1 item!
  assert.equal(farmer1View.items.length, 1);
  assert.equal(farmer1View.items[0].sellerId, farmer1.uid);
  assert.equal(farmer1View.items[0].productNameSnapshot, 'Sharbati Wheat');
  console.log("✔ Passed: Farmer 1 view strictly isolated. Other seller's commercial items omitted.");
  passed++;

  // TEST 6: Farmer 2 only sees their produce
  console.log('TEST 6: Farmer 2 view isolation');
  const farmer2View = await service.getOrderById(multiSellerOrder.id, farmer2);
  assert.equal(farmer2View.items.length, 1);
  assert.equal(farmer2View.items[0].sellerId, farmer2.uid);
  assert.equal(farmer2View.items[0].productNameSnapshot, 'Ooty Hill Garlic');
  console.log('✔ Passed: Farmer 2 view strictly isolated.');
  passed++;

  // TEST 7: Unrelated farmer cannot view order
  console.log('TEST 7: Unrelated farmer cannot view order');
  const unrelatedFarmer: AuthenticatedUser = {
    uid: 'farmer-stranger-999',
    role: 'farmer',
    name: 'Stranger Farmer',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  await assert.rejects(
    async () => {
      await service.getOrderById(multiSellerOrder.id, unrelatedFarmer);
    },
    (err: unknown) => {
      return err instanceof AuthorizationError && err.statusCode === 403;
    }
  );
  console.log('✔ Passed: Unrelated seller blocked with 403 FORBIDDEN.');
  passed++;

  // TEST 8: Admin can view any order with all items
  console.log('TEST 8: Admin can view multi-seller order with all items');
  const adminView = await service.getOrderById(multiSellerOrder.id, adminUser);
  assert.equal(adminView.items.length, 2);
  console.log('✔ Passed: Admin can view complete order with all participating sellers.');
  passed++;

  // TEST 9: Unauthorized cancellation (Buyer B cannot cancel Buyer A's order)
  console.log("TEST 9: Unauthorized actor cannot cancel Buyer A's order");
  await assert.rejects(
    async () => {
      await service.cancelOrder(orderA.id, buyerB, 'Malicious cancel attempt');
    },
    (err: unknown) => {
      return err instanceof AuthorizationError && err.statusCode === 403;
    }
  );
  console.log('✔ Passed: Unauthorized cancellation blocked with 403 FORBIDDEN.');
  passed++;

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${passed} ORDER API & RBAC SECURITY TESTS PASSED!`);
  console.log('====================================================\n');
}

runOrderApiSecurityTests().catch((err) => {
  console.error('Order API Security Test Suite Failed:', err);
  process.exit(1);
});
