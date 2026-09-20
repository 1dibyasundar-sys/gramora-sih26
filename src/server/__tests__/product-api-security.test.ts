/**
 * PRODUCT API & RBAC SECURITY TEST SUITE
 * Verifies authentication guards, role restrictions, ownership isolation,
 * and client-side tampering protections on product endpoints.
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as postProductRoute, GET as getProductsRoute } from '@/app/api/v1/products/route';
import {
  GET as getProductDetailRoute,
  PATCH as patchProductRoute,
  DELETE as deleteProductRoute,
} from '@/app/api/v1/products/[id]/route';
import { ProductRepository } from '../repositories/product.repository';
import { ProductLotRepository } from '../repositories/product-lot.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ProductService } from '../services/product.service';
import { InventoryService } from '../services/inventory.service';
import { ServerProduct, ServerProductLot } from '../domain/product';
import { ServerInventoryLot } from '../domain/inventory';
import { AuthenticatedUser } from '../auth/verify-token';
import { AuthorizationError, NotFoundError } from '../lib/errors';

class MockInventoryRepoForSec extends InventoryRepository {
  public store = new Map<string, ServerInventoryLot>();
  constructor() {
    super();
  }
  async runTransaction<T>(fn: any): Promise<T> {
    const tx = {
      get: async (ref: any) => {
        const item = this.store.get(ref.id);
        return { exists: !!item, data: () => item, id: ref.id };
      },
      update: (ref: any, data: any) => {
        const item = this.store.get(ref.id);
        if (item) this.store.set(ref.id, { ...item, ...data });
      },
    };
    return fn(tx);
  }
  async getInTransaction(tx: any, id: string): Promise<ServerInventoryLot | null> {
    return this.store.get(id) || null;
  }
  updateInTransaction(tx: any, id: string, data: any): void {
    const item = this.store.get(id);
    if (item) this.store.set(id, { ...item, ...data });
  }
}

class MockProductRepo extends ProductRepository {
  public store = new Map<string, ServerProduct>();

  public get db() {
    return null as any;
  }

  constructor() {
    super();
  }

  async findById(id: string): Promise<ServerProduct | null> {
    const item = this.store.get(id);
    return item ? { ...item } : null;
  }

  async create(data: Omit<ServerProduct, 'id'>, customId?: string): Promise<ServerProduct> {
    const id = customId || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const full: ServerProduct = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as ServerProduct;
    this.store.set(id, full);
    return full;
  }

  async update(id: string, updates: Partial<Omit<ServerProduct, 'id'>>): Promise<ServerProduct> {
    const existing = this.store.get(id);
    if (!existing) throw new NotFoundError('Product listing', id);
    const updated: ServerProduct = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }
}

class MockProductLotRepo extends ProductLotRepository {
  public lots = new Map<string, ServerProductLot>();

  constructor() {
    super();
  }

  async findActiveLots(productId: string): Promise<ServerProductLot[]> {
    return Array.from(this.lots.values()).filter(
      (l) => l.productId === productId && l.status === 'available'
    );
  }
}

async function runProductApiSecurityTests() {
  console.log('====================================================');
  console.log('STARTING PRODUCT API & RBAC SECURITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated POST /api/v1/products -> 401
  // --------------------------------------------------------------------------
  {
    console.log('TEST 1: Unauthenticated POST /api/v1/products -> 401');
    const req = new NextRequest('http://localhost:3000/api/v1/products', {
      method: 'POST',
      body: JSON.stringify({ title: 'Unauthorized Produce' }),
    });

    const res = await postProductRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    console.log('✔ Passed: Unauthenticated product creation rejected with 401.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Unauthenticated PATCH /api/v1/products/[id] -> 401
  // --------------------------------------------------------------------------
  {
    console.log('TEST 2: Unauthenticated PATCH /api/v1/products/[id] -> 401');
    const req = new NextRequest('http://localhost:3000/api/v1/products/prod-01', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    });

    const res = await patchProductRoute(req, { params: { id: 'prod-01' } });
    assert.equal(res.status, 401);
    console.log('✔ Passed: Unauthenticated product update rejected with 401.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Unauthenticated DELETE /api/v1/products/[id] -> 401
  // --------------------------------------------------------------------------
  {
    console.log('TEST 3: Unauthenticated DELETE /api/v1/products/[id] -> 401');
    const req = new NextRequest('http://localhost:3000/api/v1/products/prod-01', {
      method: 'DELETE',
    });

    const res = await deleteProductRoute(req, { params: { id: 'prod-01' } });
    assert.equal(res.status, 401);
    console.log('✔ Passed: Unauthenticated product deletion rejected with 401.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Buyer or Consumer role cannot create product
  // --------------------------------------------------------------------------
  {
    console.log('TEST 4: Buyer / Consumer role cannot create product (RBAC guard)');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const buyerUser: AuthenticatedUser = {
      uid: 'buyer-uid-101',
      role: 'buyer',
      name: 'Supermarket Buyer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await service.createProduct(buyerUser, {
          title: 'Direct Listing Attempt',
          category: 'vegetables',
          variety: 'Red',
          pricePerUnit: 25,
          unit: 'kg',
          minOrderQuantity: 10,
          totalAvailableQuantity: 100,
          location: { district: 'Nashik', state: 'MH' },
          harvestDate: '2026-03-20',
          shelfLifeDays: 30,
          qualityGrade: 'Grade A',
          storageType: 'Ambient Warehouse',
          description: 'Attempting to create listing as buyer',
          organicCertified: false,
          tags: [],
          images: [],
          listingStatus: 'active',
        });
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    console.log('✔ Passed: Buyer role prohibited from creating marketplace listings.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Farmer creates product; sellerId is authoritatively bound to token UID
  // --------------------------------------------------------------------------
  {
    console.log('TEST 5: Farmer creates product with authoritative sellerId');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const farmerUser: AuthenticatedUser = {
      uid: 'farmer-ananya-404',
      role: 'farmer',
      name: 'Ananya Farms',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const created = await service.createProduct(farmerUser, {
      title: 'Nashik Red Onions',
      category: 'vegetables',
      variety: 'Garwa',
      pricePerUnit: 28,
      unit: 'kg',
      minOrderQuantity: 50,
      totalAvailableQuantity: 2000,
      location: { district: 'Nashik', state: 'Maharashtra' },
      harvestDate: '2026-03-20',
      shelfLifeDays: 90,
      qualityGrade: 'Grade A',
      storageType: 'Ambient Warehouse',
      description: 'Sun-cured premium Nashik red onions with strong pungency.',
      organicCertified: false,
      tags: ['Onions', 'Direct Gate'],
      images: ['https://example.com/onion.jpg'],
      listingStatus: 'active',
    });

    assert.equal(created.sellerId, farmerUser.uid);
    assert.equal(created.sellerName, farmerUser.name);
    assert.equal(created.pricePerUnitPaise, 2800); // 28 * 100 paise
    console.log('✔ Passed: Product created and strictly bound to authenticated UID.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Non-owner farmer cannot update another farmer's product
  // --------------------------------------------------------------------------
  {
    console.log('TEST 6: Non-owner farmer cannot update another farmer product');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const owner: AuthenticatedUser = {
      uid: 'farmer-owner-1',
      role: 'farmer',
      name: 'Owner Farmer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const attacker: AuthenticatedUser = {
      uid: 'farmer-attacker-2',
      role: 'farmer',
      name: 'Other Farmer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const product = await service.createProduct(owner, {
      title: 'Owner Special Garlic',
      category: 'spices',
      variety: 'Yamuna Safed',
      pricePerUnit: 120,
      unit: 'kg',
      minOrderQuantity: 10,
      totalAvailableQuantity: 500,
      location: { district: 'Indore', state: 'MP' },
      harvestDate: '2026-03-10',
      shelfLifeDays: 120,
      qualityGrade: 'Grade A',
      storageType: 'Farm Gate Dry',
      description: 'Premium cured white garlic cloves.',
      organicCertified: false,
      tags: [],
      images: [],
      listingStatus: 'active',
    });

    await assert.rejects(
      async () => {
        await service.updateProduct(product.id, attacker, {
          pricePerUnit: 10, // Attacker trying to tank the price
        });
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    console.log('✔ Passed: Non-owner update rejected with 403 FORBIDDEN.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Owner farmer can update their own product
  // --------------------------------------------------------------------------
  {
    console.log('TEST 7: Owner farmer can update their product');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const owner: AuthenticatedUser = {
      uid: 'farmer-owner-1',
      role: 'farmer',
      name: 'Owner Farmer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const product = await service.createProduct(owner, {
      title: 'Owner Special Garlic',
      category: 'spices',
      variety: 'Yamuna Safed',
      pricePerUnit: 120,
      unit: 'kg',
      minOrderQuantity: 10,
      totalAvailableQuantity: 500,
      location: { district: 'Indore', state: 'MP' },
      harvestDate: '2026-03-10',
      shelfLifeDays: 120,
      qualityGrade: 'Grade A',
      storageType: 'Farm Gate Dry',
      description: 'Premium cured white garlic cloves.',
      organicCertified: false,
      tags: [],
      images: [],
      listingStatus: 'active',
    });

    const updated = await service.updateProduct(product.id, owner, {
      pricePerUnit: 135,
      description: 'Updated price reflecting market demand surge.',
    });

    assert.equal(updated.pricePerUnit, 135);
    assert.equal(updated.pricePerUnitPaise, 13500);
    console.log('✔ Passed: Owner successfully updated their product.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Archived product is hidden from public detail
  // --------------------------------------------------------------------------
  {
    console.log('TEST 8: Archived product is hidden from public retrieval');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const owner: AuthenticatedUser = {
      uid: 'farmer-owner-1',
      role: 'farmer',
      name: 'Owner Farmer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const product = await service.createProduct(owner, {
      title: 'Historical Wheat Batch',
      category: 'grains',
      variety: 'Sharbati',
      pricePerUnit: 35,
      unit: 'kg',
      minOrderQuantity: 100,
      totalAvailableQuantity: 1000,
      location: { district: 'Sehore', state: 'MP' },
      harvestDate: '2025-04-10',
      shelfLifeDays: 365,
      qualityGrade: 'Grade A (Export)',
      storageType: 'Ambient Warehouse',
      description: 'Past harvest listing.',
      organicCertified: true,
      tags: [],
      images: [],
      listingStatus: 'active',
    });

    // Archive it
    await service.archiveProduct(product.id, owner);

    // Public retrieval attempts to access it
    await assert.rejects(
      async () => {
        await service.getProductById(product.id, null);
      },
      (err: any) => {
        assert.equal(err.code, 'NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    console.log('✔ Passed: Archived product returns 404 NOT_FOUND.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Administrator cannot create agricultural seller listings
  // --------------------------------------------------------------------------
  {
    console.log('TEST 9: Administrator role cannot create agricultural product listings');
    const mockRepo = new MockProductRepo();
    const mockLotRepo = new MockProductLotRepo();
    const service = new ProductService(mockRepo, mockLotRepo);

    const adminUser: AuthenticatedUser = {
      uid: 'admin-super-01',
      role: 'admin',
      name: 'System Administrator',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await service.createProduct(adminUser, {
          title: 'Admin Listed Onions',
          category: 'vegetables',
          variety: 'Red',
          pricePerUnit: 25,
          unit: 'kg',
          minOrderQuantity: 10,
          totalAvailableQuantity: 100,
          location: { district: 'Nashik', state: 'MH' },
          harvestDate: '2026-03-20',
          shelfLifeDays: 30,
          qualityGrade: 'Grade A',
          storageType: 'Ambient Warehouse',
          description: 'Admin attempt to create listing directly',
          organicCertified: false,
          tags: [],
          images: [],
          listingStatus: 'active',
        });
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    console.log('✔ Passed: Administrator account prohibited from creating seller-owned listings.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Arbitrary user cannot directly reserve another seller's inventory
  // --------------------------------------------------------------------------
  {
    console.log("TEST 10: Arbitrary user cannot directly reserve another seller's inventory");
    const mockInvRepo = new MockInventoryRepoForSec();
    const invService = new InventoryService(mockInvRepo);

    mockInvRepo.store.set('inv-seller-lot-1', {
      id: 'inv-seller-lot-1',
      productLotId: 'plot-1',
      productId: 'prod-1',
      ownerId: 'farmer-legit-01',
      quantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
      unit: 'kg',
      warehouseLocation: 'Nashik Hub',
      storageCondition: 'Ambient Warehouse',
      receivedAt: '2026-09-10',
      expiryDate: '2026-12-31',
      status: 'in_stock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const buyerUser: AuthenticatedUser = {
      uid: 'random-buyer-uid-99',
      role: 'buyer',
      name: 'Random Buyer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await invService.reserveStock('inv-seller-lot-1', 20, buyerUser, 'ORD-UNAUTHORIZED');
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    console.log('✔ Passed: Direct reservation by arbitrary caller rejected with 403 FORBIDDEN.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 11: Arbitrary user cannot release another user's reservation
  // --------------------------------------------------------------------------
  {
    console.log("TEST 11: Arbitrary user cannot release another seller's inventory reservation");
    const mockInvRepo = new MockInventoryRepoForSec();
    const invService = new InventoryService(mockInvRepo);

    mockInvRepo.store.set('inv-seller-lot-2', {
      id: 'inv-seller-lot-2',
      productLotId: 'plot-2',
      productId: 'prod-2',
      ownerId: 'farmer-legit-01',
      quantity: 100,
      reservedQuantity: 40,
      availableQuantity: 60,
      unit: 'kg',
      warehouseLocation: 'Nashik Hub',
      storageCondition: 'Ambient Warehouse',
      receivedAt: '2026-09-10',
      expiryDate: '2026-12-31',
      status: 'in_stock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const rivalFarmer: AuthenticatedUser = {
      uid: 'rival-farmer-uid-88',
      role: 'farmer',
      name: 'Rival Farmer',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await invService.releaseStock('inv-seller-lot-2', 20, rivalFarmer, 'ORD-HIJACK');
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    console.log('✔ Passed: Direct release by unauthorized caller rejected with 403 FORBIDDEN.\n');
    passed++;
  }

  console.log(`====================================================`);
  console.log(`ALL ${passed}/${passed} PRODUCT API SECURITY TESTS PASSED!`);
  console.log(`====================================================\n`);
}

runProductApiSecurityTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
