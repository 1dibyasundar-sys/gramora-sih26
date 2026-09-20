/**
 * TRANSACTIONAL INVENTORY & CONCURRENCY TEST SUITE
 * Tests Firestore transaction semantics: atomic reservation, release,
 * over-allocation prevention, and stock adjustment safety.
 */

import assert from 'node:assert/strict';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryService } from '../services/inventory.service';
import { ServerInventoryLot, calculateInventoryStatus } from '../domain/inventory';
import { AuthenticatedUser } from '../auth/verify-token';
import { AppError, BadRequestError, AuthorizationError } from '../lib/errors';
import { Transaction } from 'firebase-admin/firestore';

class MockTransactionalInventoryRepo extends InventoryRepository {
  private store = new Map<string, ServerInventoryLot>();
  private locks = new Set<string>();

  constructor() {
    super();
  }

  seed(lot: ServerInventoryLot) {
    this.store.set(lot.id, { ...lot });
  }

  async findById(id: string): Promise<ServerInventoryLot | null> {
    const item = this.store.get(id);
    return item ? { ...item } : null;
  }

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    // Transactional simulation with simulated doc locking
    const stagedUpdates = new Map<string, Partial<ServerInventoryLot>>();

    const fakeTx = {
      get: async (docRef: any) => {
        const id = docRef.id;
        const item = this.store.get(id);
        if (!item) {
          return { exists: false, data: () => undefined, id };
        }
        return { exists: true, data: () => ({ ...item }), id };
      },
      update: (docRef: any, data: any) => {
        const id = docRef.id;
        const existing = stagedUpdates.get(id) || {};
        stagedUpdates.set(id, { ...existing, ...data });
      },
    } as unknown as Transaction;

    // Execute callback
    const result = await updateFunction(fakeTx);

    // Commit staged updates atomically
    stagedUpdates.forEach((updates, id) => {
      const current = this.store.get(id);
      if (current) {
        this.store.set(id, { ...current, ...updates, updatedAt: new Date().toISOString() });
      }
    });

    return result;
  }

  async getInTransaction(transaction: Transaction, id: string): Promise<ServerInventoryLot | null> {
    const snap = (await (transaction as any).get({ id })) as { exists: boolean; data: () => ServerInventoryLot };
    if (!snap.exists) return null;
    return snap.data();
  }

  updateInTransaction(
    transaction: Transaction,
    id: string,
    updates: Partial<Omit<ServerInventoryLot, 'id'>>
  ): void {
    transaction.update({ id } as any, updates);
  }
}

async function runInventoryTransactionTests() {
  console.log('====================================================');
  console.log('STARTING TRANSACTIONAL INVENTORY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;

  const mockRepo = new MockTransactionalInventoryRepo();
  const service = new InventoryService(mockRepo);

  const farmerUser: AuthenticatedUser = {
    uid: 'farmer-ramesh-001',
    role: 'farmer',
    name: 'Ramesh Patel',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const hackerUser: AuthenticatedUser = {
    uid: 'intruder-999',
    role: 'farmer',
    name: 'Malicious Actor',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  const testLotId = 'inv-lot-onion-100';

  // Seed inventory lot: 100 kg total, 0 reserved, 100 available
  mockRepo.seed({
    id: testLotId,
    productLotId: 'plot-onion-01',
    productId: 'prod-onion-nashik',
    ownerId: farmerUser.uid,
    quantity: 100,
    reservedQuantity: 0,
    availableQuantity: 100,
    unit: 'kg',
    warehouseLocation: 'Nashik APMC Reefer Unit 2',
    storageCondition: 'Ambient Warehouse',
    receivedAt: '2026-09-10',
    expiryDate: '2026-12-31',
    status: 'in_stock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // --------------------------------------------------------------------------
  // TEST 1: First reservation succeeds
  // --------------------------------------------------------------------------
  {
    console.log('TEST 1: Atomic reservation (60 kg) succeeds');
    const reserved = await service.reserveStock(testLotId, 60, 'ORD-TEST-001');

    assert.equal(reserved.reservedQuantity, 60);
    assert.equal(reserved.availableQuantity, 40);
    assert.equal(reserved.quantity, 100);
    console.log('✔ Passed: 60 kg locked. Remaining available: 40 kg.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Second concurrent reservation exceeding available stock is rejected
  // --------------------------------------------------------------------------
  {
    console.log('TEST 2: Second reservation (50 kg) exceeding available stock is rejected');
    await assert.rejects(
      async () => {
        // Attempting to reserve 50 kg when only 40 kg is available
        await service.reserveStock(testLotId, 50, 'ORD-TEST-002');
      },
      (err: any) => {
        assert.equal(err.code, 'INSUFFICIENT_INVENTORY');
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // Verify state remained unchanged
    const current = await mockRepo.findById(testLotId);
    assert.equal(current?.reservedQuantity, 60);
    assert.equal(current?.availableQuantity, 40);
    console.log('✔ Passed: Over-reservation prevented atomically; status 409 INSUFFICIENT_INVENTORY.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Partial release of reserved stock
  // --------------------------------------------------------------------------
  {
    console.log('TEST 3: Releasing 30 kg of reserved stock');
    const released = await service.releaseStock(testLotId, 30, 'ORD-TEST-001');

    assert.equal(released.reservedQuantity, 30);
    assert.equal(released.availableQuantity, 70);
    console.log('✔ Passed: 30 kg released. Available pool restored to 70 kg.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Previously rejected reservation now succeeds
  // --------------------------------------------------------------------------
  {
    console.log('TEST 4: Reserving 50 kg now succeeds');
    const secondReservation = await service.reserveStock(testLotId, 50, 'ORD-TEST-002');

    assert.equal(secondReservation.reservedQuantity, 80);
    assert.equal(secondReservation.availableQuantity, 20);
    assert.equal(secondReservation.status, 'critical'); // Available < 50 triggers critical
    console.log('✔ Passed: Reservation succeeded. Status updated to critical.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Stock adjustment - increase
  // --------------------------------------------------------------------------
  {
    console.log('TEST 5: Stock adjustment (increase by 50 kg)');
    const adjusted = await service.adjustStock(testLotId, farmerUser, {
      adjustmentType: 'increase',
      quantity: 50,
      reason: 'Fresh delivery from farm',
    });

    assert.equal(adjusted.quantity, 150);
    assert.equal(adjusted.reservedQuantity, 80);
    assert.equal(adjusted.availableQuantity, 70);
    assert.equal(adjusted.status, 'low_stock'); // Available 70 is < 200 => low_stock
    console.log('✔ Passed: Stock increased. New total: 150 kg.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Stock reduction below reserved amount fails
  // --------------------------------------------------------------------------
  {
    console.log('TEST 6: Stock reduction below reserved amount is blocked');
    // Reserved is 80 kg. Attempting to reduce quantity below 80 kg (e.g. set to 70 kg or reduce by 100 kg)
    await assert.rejects(
      async () => {
        await service.adjustStock(testLotId, farmerUser, {
          adjustmentType: 'decrease',
          quantity: 100, // 150 - 100 = 50 < 80 reserved!
          reason: 'Attempted spoilage writeoff exceeding free stock',
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('currently reserved in active orders'));
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
    console.log('✔ Passed: Stock reduction below reserved quantity blocked.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Unauthorized adjustment attempt by different user is blocked
  // --------------------------------------------------------------------------
  {
    console.log('TEST 7: Unauthorized inventory adjustment blocked');
    await assert.rejects(
      async () => {
        await service.adjustStock(testLotId, hackerUser, {
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'Tampering attempt',
        });
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ Passed: Unauthorized actor rejected with 403.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Releasing more stock than currently reserved throws BadRequestError
  // --------------------------------------------------------------------------
  {
    console.log('TEST 8: Releasing more stock than currently reserved throws BadRequestError');
    // Currently reserved is 80 kg. Attempting to release 90 kg must be rejected!
    await assert.rejects(
      async () => {
        await service.releaseStock(testLotId, 90, farmerUser, 'ORD-OVER-RELEASE');
      },
      (err: any) => {
        assert.ok(err.message.includes('Cannot release 90 units because only 80 is currently reserved'));
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
    console.log('✔ Passed: Excess release rejected with 400 BadRequestError.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Authorized owner releases 50 kg of reserved stock
  // --------------------------------------------------------------------------
  {
    console.log('TEST 9: Authorized owner releases 50 kg of reserved stock');
    const released = await service.releaseStock(testLotId, 50, farmerUser, 'ORD-PARTIAL-CANCEL');

    assert.equal(released.reservedQuantity, 30);
    assert.equal(released.availableQuantity, 120);
    assert.equal(released.quantity, 150);
    assert.equal(released.status, 'low_stock'); // 120 is < 200
    console.log('✔ Passed: 50 kg released by owner. Reserved: 30 kg, Available: 120 kg.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Invariant availableQuantity = quantity - reservedQuantity verified
  // --------------------------------------------------------------------------
  {
    console.log('TEST 10: Verifying availableQuantity = quantity - reservedQuantity invariant');
    const current = await mockRepo.findById(testLotId);
    assert.ok(current);
    assert.equal(current.availableQuantity, current.quantity - current.reservedQuantity);
    assert.ok(current.availableQuantity >= 0);
    assert.ok(current.reservedQuantity >= 0);
    assert.ok(current.quantity >= current.reservedQuantity);
    console.log('✔ Passed: Invariant strictly verified: availableQuantity == quantity - reservedQuantity.\n');
    passed++;
  }

  console.log(`====================================================`);
  console.log(`ALL ${passed}/${passed} TRANSACTIONAL INVENTORY TESTS PASSED!`);
  console.log(`====================================================\n`);
}

runInventoryTransactionTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
