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

  console.log(`====================================================`);
  console.log(`ALL ${passed}/${passed} PRODUCT DOMAIN TESTS PASSED!`);
  console.log(`====================================================\n`);
}

runProductDomainTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
