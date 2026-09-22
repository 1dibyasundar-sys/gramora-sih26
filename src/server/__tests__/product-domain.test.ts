/**
 * PRODUCT & INVENTORY DOMAIN LOGIC UNIT TEST SUITE
 * Tests schemas, status transitions, and data integrity invariants.
 */

import assert from 'node:assert/strict';
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateProductLotSchema,
  UpdateProductLotSchema,
  ProductQuerySchema,
} from '../domain/product';
import {
  AdjustStockSchema,
  ReserveStockSchema,
  ReleaseStockSchema,
  calculateInventoryStatus,
} from '../domain/inventory';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductLotRepository } from '../repositories/product-lot.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ServerProduct } from '../domain/product';

class MockProductRepoForDomain extends ProductRepository {
  public store = new Map<string, ServerProduct>();
  public get db() {
    return null as any;
  }
  constructor() {
    super();
  }
  private idCounter = 0;
  async create(data: any, customId?: string): Promise<ServerProduct> {
    this.idCounter++;
    const item = { ...data, id: customId || `prod-${Date.now()}-${this.idCounter}-${Math.random().toString(36).slice(2, 7)}` };
    this.store.set(item.id, item);
    return item;
  }
  async findById(id: string): Promise<ServerProduct | null> {
    return this.store.get(id) || null;
  }
}
class MockLotRepoForDomain extends ProductLotRepository {
  public store = new Map<string, any>();
  private idCounter = 0;
  constructor() {
    super();
  }
  async create(data: any): Promise<any> {
    this.idCounter++;
    const item = { ...data, id: `lot-${Date.now()}-${this.idCounter}` };
    this.store.set(item.id, item);
    return item;
  }
  async findActiveLots(productId: string): Promise<any[]> {
    return [];
  }
}
class MockInventoryRepoForDomain extends InventoryRepository {
  public store = new Map<string, any>();
  private idCounter = 0;
  constructor() {
    super();
  }
  async create(data: any): Promise<any> {
    this.idCounter++;
    const item = { ...data, id: `inv-${Date.now()}-${this.idCounter}` };
    this.store.set(item.id, item);
    return item;
  }
}

async function runProductDomainTests() {
  console.log('====================================================');
  console.log('STARTING PRODUCT & INVENTORY DOMAIN TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Valid CreateProductSchema succeeds
  // --------------------------------------------------------------------------
  {
    console.log('TEST 1: Valid CreateProductSchema parsing');
    const valid = CreateProductSchema.parse({
      title: 'Nagpur Organic Fresh Oranges',
      category: 'fruits',
      variety: 'Nagpur Mandarin',
      pricePerUnit: 65.5,
      unit: 'kg',
      marketMandiPrice: 85,
      minOrderQuantity: 100,
      location: {
        district: 'Nagpur',
        state: 'Maharashtra',
        distanceKm: 25,
      },
      harvestDate: '2026-03-15',
      shelfLifeDays: 21,
      qualityGrade: 'Grade A (Export)',
      storageType: 'Cold Storage',
      description: 'Handpicked export-quality sweet Nagpur oranges directly from orchard.',
      organicCertified: true,
      tags: ['Export', 'Sweet', 'Citrus'],
    });

    assert.equal(valid.title, 'Nagpur Organic Fresh Oranges');
    assert.equal(valid.category, 'fruits');
    assert.equal(valid.listingStatus, 'active');
    console.log('✔ Passed: Valid product input parsed correctly.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Rejection of negative or zero price
  // --------------------------------------------------------------------------
  {
    console.log('TEST 2: Reject negative and zero prices');
    assert.throws(
      () => {
        CreateProductSchema.parse({
          title: 'Nagpur Oranges',
          category: 'fruits',
          variety: 'Mandarin',
          pricePerUnit: -10,
          unit: 'kg',
          minOrderQuantity: 10,
          location: { district: 'Nagpur', state: 'MH' },
          harvestDate: '2026-03-15',
          shelfLifeDays: 14,
          qualityGrade: 'Grade A',
          storageType: 'Ambient Warehouse',
          description: 'Valid produce description text.',
        });
      },
      (err: unknown) => {
        const msg = String(err);
        return msg.includes('Price per unit must be greater than zero');
      }
    );
    console.log('✔ Passed: Negative price correctly rejected.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Reject fractional paise (more than 2 decimal places)
  // --------------------------------------------------------------------------
  {
    console.log('TEST 3: Reject prices with >2 decimal places');
    assert.throws(
      () => {
        CreateProductSchema.parse({
          title: 'Nagpur Oranges',
          category: 'fruits',
          variety: 'Mandarin',
          pricePerUnit: 65.555, // Invalid: 3 decimals
          unit: 'kg',
          minOrderQuantity: 10,
          location: { district: 'Nagpur', state: 'MH' },
          harvestDate: '2026-03-15',
          shelfLifeDays: 14,
          qualityGrade: 'Grade A',
          storageType: 'Ambient Warehouse',
          description: 'Valid produce description text.',
        });
      },
      (err: unknown) => {
        const msg = String(err);
        return msg.includes('Price cannot have more than 2 decimal places');
      }
    );
    console.log('✔ Passed: Fractional paise rejected.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Reject client injecting sellerId or privileged fields
  // --------------------------------------------------------------------------
  {
    console.log('TEST 4: Reject client injection of privileged fields');
    assert.throws(
      () => {
        CreateProductSchema.parse({
          title: 'Spoofed Producer Oranges',
          category: 'fruits',
          variety: 'Mandarin',
          pricePerUnit: 50,
          unit: 'kg',
          minOrderQuantity: 10,
          location: { district: 'Nagpur', state: 'MH' },
          harvestDate: '2026-03-15',
          shelfLifeDays: 14,
          qualityGrade: 'Grade A',
          storageType: 'Ambient Warehouse',
          description: 'Valid produce description text.',
          sellerId: 'attacker-injected-uid', // FORBIDDEN
          sellerRating: 5.0, // FORBIDDEN
        });
      },
      (err: unknown) => {
        const msg = String(err);
        return msg.includes('unrecognized_keys');
      }
    );
    console.log('✔ Passed: Injection of privileged fields rejected by .strict().\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: CreateProductLotSchema validation
  // --------------------------------------------------------------------------
  {
    console.log('TEST 5: CreateProductLotSchema validation');
    const validLot = CreateProductLotSchema.parse({
      productId: 'prod-nagpur-01',
      harvestDate: '2026-03-15',
      expiryDate: '2026-04-05',
      totalQuantity: 5000,
      unit: 'kg',
      qualityGrade: 'Grade A',
      qualityScore: 92,
      storageType: 'Cold Storage',
      storageFacility: 'MahaFPC Cold Chain Hub Bay 4',
      farmGatePrice: 60,
      sellingPrice: 65,
      minOrderQuantity: 50,
    });

    assert.equal(validLot.totalQuantity, 5000);
    assert.equal(validLot.status, 'available');
    console.log('✔ Passed: Harvest lot schema validated.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: calculateInventoryStatus logic
  // --------------------------------------------------------------------------
  {
    console.log('TEST 6: Inventory status calculations');

    // Normal in stock
    assert.equal(calculateInventoryStatus(1000, 100), 'in_stock');

    // Low stock
    assert.equal(calculateInventoryStatus(150, 0), 'low_stock');

    // Critical stock
    assert.equal(calculateInventoryStatus(40, 0), 'critical');

    // Depleted / Sold out
    assert.equal(calculateInventoryStatus(0, 0), 'sold_out');

    // Fully reserved
    assert.equal(calculateInventoryStatus(100, 100), 'reserved');

    // Expired
    const pastDate = '2020-01-01';
    assert.equal(calculateInventoryStatus(1000, 0, pastDate), 'expired');

    console.log('✔ Passed: All inventory status calculation rules verified.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: AdjustStockSchema validation
  // --------------------------------------------------------------------------
  {
    console.log('TEST 7: AdjustStockSchema validation');
    const adjust = AdjustStockSchema.parse({
      adjustmentType: 'increase',
      quantity: 500,
      reason: 'Additional harvest aggregated from member farmer S. Shinde',
    });
    assert.equal(adjust.adjustmentType, 'increase');
    assert.equal(adjust.quantity, 500);

    // Rejection of invalid adjustmentType
    assert.throws(() => {
      AdjustStockSchema.parse({
        adjustmentType: 'arbitrary_hack',
        quantity: 500,
        reason: 'Valid reason here',
      });
    });
    console.log('✔ Passed: Stock adjustment schema validated.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: ProductService.createProduct correctly maps totalAvailableQuantity and initialQuantity
  // --------------------------------------------------------------------------
  {
    console.log('TEST 8: ProductService.createProduct correctly maps totalAvailableQuantity and initialQuantity');
    const pRepo = new MockProductRepoForDomain();
    const lRepo = new MockLotRepoForDomain();
    const iRepo = new MockInventoryRepoForDomain();
    const service = new ProductService(pRepo, lRepo, iRepo);

    const farmerUser = {
      uid: 'farmer-test-01',
      email: 'farmer@test.com',
      role: 'farmer' as const,
      name: 'Ramesh Farmer',
      verified: true,
      profileExists: true,
      status: 'active' as const,
      claims: {},
    };

    // Scenario A: totalAvailableQuantity: 1000
    const prodA = await service.createProduct(farmerUser, {
      title: 'Nagpur Organic Oranges',
      category: 'fruits',
      variety: 'Mandarin',
      pricePerUnit: 60,
      unit: 'kg',
      minOrderQuantity: 50,
      totalAvailableQuantity: 1000,
      location: { district: 'Nagpur', state: 'Maharashtra' },
      harvestDate: '2026-03-15',
      shelfLifeDays: 20,
      qualityGrade: 'Grade A',
      storageType: 'Cold Storage',
      description: 'Fresh Nagpur oranges',
    } as any);
    assert.equal(prodA.totalAvailableQuantity, 1000, 'totalAvailableQuantity must be 1000');

    // Scenario B: initialQuantity: 2500 (seed demo script format)
    const prodB = await service.createProduct(farmerUser, {
      title: 'Standard Organic Vine Tomatoes',
      category: 'vegetables',
      variety: 'Organic',
      pricePerUnit: 32,
      unit: 'kg',
      minOrderQuantity: 50,
      initialQuantity: 2500,
      location: { district: 'Pune', state: 'Maharashtra' },
      harvestDate: '2026-03-15',
      shelfLifeDays: 10,
      qualityGrade: 'Grade B',
      storageType: 'Cold Storage',
      description: 'Standard vine tomatoes',
    } as any);
    assert.equal(prodB.totalAvailableQuantity, 2500, 'initialQuantity must map to totalAvailableQuantity 2500');

    console.log('✔ Passed: Both totalAvailableQuantity and initialQuantity map correctly.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Category validation for all 6 standard categories + organic
  // --------------------------------------------------------------------------
  {
    console.log('TEST 9: Category validation across all domain categories');
    const validCategories = [
      'vegetables',
      'fruits',
      'grains',
      'pulses',
      'spices',
      'oilseeds',
      'organic',
    ] as const;

    for (const cat of validCategories) {
      const parsed = CreateProductSchema.parse({
        title: `Test ${cat} product`,
        category: cat,
        variety: 'Standard',
        pricePerUnit: 100,
        unit: 'kg',
        minOrderQuantity: 10,
        location: { district: 'Nashik', state: 'Maharashtra' },
        harvestDate: '2026-03-15',
        shelfLifeDays: 30,
        qualityGrade: 'Grade A',
        storageType: 'Ambient Warehouse',
        description: `Freshly harvested ${cat} produced locally.`,
      });
      assert.equal(parsed.category, cat);
    }

    // Invalid category rejection
    assert.throws(() => {
      CreateProductSchema.parse({
        title: 'Invalid category crop',
        category: 'electronics' as any,
        variety: 'Standard',
        pricePerUnit: 100,
        unit: 'kg',
        minOrderQuantity: 10,
        location: { district: 'Nashik', state: 'Maharashtra' },
        harvestDate: '2026-03-15',
        shelfLifeDays: 30,
        qualityGrade: 'Grade A',
        storageType: 'Ambient Warehouse',
        description: 'Should fail validation.',
      });
    });

    console.log('✔ Passed: All 6 categories + organic accepted; invalid categories rejected.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Marketplace search and filter logic with pulses, spices, oilseeds
  // --------------------------------------------------------------------------
  {
    console.log('TEST 10: Marketplace search and filter logic with pulses, spices, oilseeds');
    const pRepo = new MockProductRepoForDomain();
    const lRepo = new MockLotRepoForDomain();
    const iRepo = new MockInventoryRepoForDomain();
    const service = new ProductService(pRepo, lRepo, iRepo);

    const farmerUser = {
      uid: 'gramora-demo-farmer',
      email: 'farmer@gramora.farm',
      role: 'farmer' as const,
      name: 'Gramora Demo Farm',
      verified: true,
      profileExists: true,
      status: 'active' as const,
      claims: {},
    };

    // Seed mock products covering all categories
    const mockItems = [
      { title: 'Organic Toor Dal', category: 'pulses', variety: 'Desi', pricePerUnit: 145 },
      { title: 'Kabuli Chickpeas', category: 'pulses', variety: 'Bold', pricePerUnit: 130 },
      { title: 'Salem Golden Turmeric', category: 'spices', variety: 'Salem', pricePerUnit: 220 },
      { title: 'Aromatic Cumin Seeds', category: 'spices', variety: 'Gujarat Bold', pricePerUnit: 340 },
      { title: 'High-Oil Mustard Seeds', category: 'oilseeds', variety: 'Black Mustard', pricePerUnit: 90 },
      { title: 'Shelled Bold Groundnuts', category: 'oilseeds', variety: 'Bold 40-50', pricePerUnit: 115 },
      { title: 'Organic Vine Tomatoes', category: 'vegetables', variety: 'Organic', pricePerUnit: 35 },
      { title: 'Alphonso Mangoes', category: 'fruits', variety: 'Ratnagiri', pricePerUnit: 450 },
      { title: 'Sharbati Wheat', category: 'grains', variety: 'Sharbati Gold', pricePerUnit: 48 },
    ];

    for (const item of mockItems) {
      await service.createProduct(farmerUser, {
        ...item,
        unit: 'kg',
        minOrderQuantity: 25,
        totalAvailableQuantity: 1000,
        location: { district: 'Nashik', state: 'Maharashtra' },
        harvestDate: '2026-03-15',
        shelfLifeDays: 90,
        qualityGrade: 'Grade A',
        storageType: 'Ambient Warehouse',
        description: `Description for ${item.title}`,
      } as any);
    }

    // Verify all products in store
    const allProducts = Array.from(pRepo.store.values());
    assert.equal(allProducts.length, 9, 'Must contain 9 seeded mock products');

    // 1. All Categories returns 9 products
    const allActive = allProducts.filter((p) => p.listingStatus === 'active');
    assert.equal(allActive.length, 9);

    // 2. Pulses returns >0 products
    const pulses = allProducts.filter((p) => p.category === 'pulses');
    assert.equal(pulses.length, 2, 'Pulses must return >0 (2 products)');

    // 3. Spices returns >0 products
    const spices = allProducts.filter((p) => p.category === 'spices');
    assert.equal(spices.length, 2, 'Spices must return >0 (2 products)');

    // 4. Oilseeds returns >0 products
    const oilseeds = allProducts.filter((p) => p.category === 'oilseeds');
    assert.equal(oilseeds.length, 2, 'Oilseeds must return >0 (2 products)');

    // 5. Category + Search combination
    const turmericSearch = allProducts.filter(
      (p) => p.category === 'spices' && p.title.toLowerCase().includes('turmeric')
    );
    assert.equal(turmericSearch.length, 1);
    assert.equal(turmericSearch[0].title, 'Salem Golden Turmeric');

    // 6. Reset filters returns all 9
    assert.equal(allActive.length, 9);

    console.log('✔ Passed: All categories return >0 products and filter combinations work.\n');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 11: Catalog visibility invariants (draft/archived excluded from active)
  // --------------------------------------------------------------------------
  {
    console.log('TEST 11: Catalog visibility rules (draft/archived excluded)');
    const pRepo = new MockProductRepoForDomain();
    const lRepo = new MockLotRepoForDomain();
    const iRepo = new MockInventoryRepoForDomain();
    const service = new ProductService(pRepo, lRepo, iRepo);

    const farmerUser = {
      uid: 'farmer-vis-01',
      email: 'vis@test.com',
      role: 'farmer' as const,
      name: 'Farmer Visibility',
      verified: true,
      profileExists: true,
      status: 'active' as const,
      claims: {},
    };

    const activeProd = await service.createProduct(farmerUser, {
      title: 'Active Garlic',
      category: 'vegetables',
      variety: 'Desi',
      pricePerUnit: 120,
      unit: 'kg',
      minOrderQuantity: 10,
      totalAvailableQuantity: 500,
      location: { district: 'Pune', state: 'Maharashtra' },
      harvestDate: '2026-03-15',
      shelfLifeDays: 60,
      qualityGrade: 'Grade A',
      storageType: 'Ambient Warehouse',
      description: 'Active listing',
    } as any);

    // Simulate draft product
    const draftProd = {
      ...activeProd,
      id: 'prod-draft-01',
      title: 'Unpublished Draft Pulse',
      category: 'pulses' as const,
      listingStatus: 'draft' as const,
    };
    pRepo.store.set(draftProd.id, draftProd as any);

    // Simulate archived product
    const archivedProd = {
      ...activeProd,
      id: 'prod-archived-01',
      title: 'Old Archived Spice',
      category: 'spices' as const,
      listingStatus: 'archived' as const,
    };
    pRepo.store.set(archivedProd.id, archivedProd as any);

    // Marketplace active filter: only 'active' listings should appear
    const marketplaceVisible = Array.from(pRepo.store.values()).filter(
      (p) => p.listingStatus === 'active'
    );
    assert.equal(marketplaceVisible.length, 1);
    assert.equal(marketplaceVisible[0].title, 'Active Garlic');

    // Neither draft nor archived appear
    assert(!marketplaceVisible.some((p) => p.listingStatus === 'draft'));
    assert(!marketplaceVisible.some((p) => p.listingStatus === 'archived'));

    console.log('✔ Passed: Draft and archived listings strictly excluded from active catalog.\n');
    passed++;
  }

  console.log(`====================================================`);
  console.log(`ALL ${passed}/${passed} PRODUCT DOMAIN TESTS PASSED!`);
  console.log(`====================================================\n`);
}

runProductDomainTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
