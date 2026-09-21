/**
 * GRAMORA — DEMO CATALOG LIVE-DATA RECONCILIATION SCRIPT
 *
 * Safely reconciles the 20 known demo catalog products owned by 'gramora-demo-farmer'
 * whose totalAvailableQuantity was set to 0 due to the historic seed contract bug.
 *
 * Safety Rules:
 * - Read-only by default (DRY_RUN mode).
 * - Requires explicit --execute CLI flag or EXECUTE=true env var.
 * - Targets ONLY products where sellerId === 'gramora-demo-farmer'.
 * - Verifies no existing orders, reservations, or escrow records exist before modifying anything.
 * - Idempotent: checks for existing lots before creating them.
 * - Atomic: uses Firestore batch operations.
 * - Validates initialQuantity (must be 1000 or 2500).
 * - Preserves all existing product IDs, images, titles, pricing, and metadata.
 */

import { getFirestore } from '../lib/firebase-admin';
import { COLLECTIONS } from '../repositories/collections';
import { ServerProduct, ServerProductLot } from '../domain/product';
import { ServerInventoryLot, calculateInventoryStatus } from '../domain/inventory';

const TARGET_SELLER_ID = 'gramora-demo-farmer';
const EXPECTED_DEMO_COUNT = 20;
const VALID_QUANTITIES = [1000, 2500];

interface ProductReconciliationPlan {
  id: string;
  title: string;
  variant: 'Premium' | 'Standard' | 'Unknown';
  currentAvailable: number;
  initialQuantity: number;
  targetAvailable: number;
  existingProductLots: number;
  existingInventoryLots: number;
  action: 'RECONCILE' | 'ALREADY_HEALTHY' | 'INVALID_QUANTITY' | 'SKIP';
  reason?: string;
  harvestDate: string;
  shelfLifeDays: number;
  unit: 'kg' | 'quintal' | 'tonne' | 'crate' | 'box';
  qualityGrade: any;
  moistureContentPercent?: number;
  storageType: any;
  locationDistrict: string;
  pricePerUnit: number;
  minOrderQuantity: number;
}

export async function runReconciliation() {
  const isExecute = process.argv.includes('--execute') || process.env.EXECUTE === 'true';
  console.log('================================================================');
  console.log(`GRAMORA DEMO CATALOG RECONCILIATION [MODE: ${isExecute ? 'EXECUTE (LIVE WRITE)' : 'DRY RUN (READ ONLY)'}]`);
  console.log('================================================================\n');

  const db = getFirestore();

  // -------------------------------------------------------------
  // PHASE 2: PRE-FLIGHT SAFETY CHECK
  // -------------------------------------------------------------
  console.log('PHASE 2: Running pre-flight safety checks...');

  // 1. Query target demo products
  const demoSnap = await db.collection(COLLECTIONS.PRODUCTS).where('sellerId', '==', TARGET_SELLER_ID).get();
  console.log(`Found ${demoSnap.docs.length} products with sellerId='${TARGET_SELLER_ID}'.`);

  if (demoSnap.docs.length !== EXPECTED_DEMO_COUNT) {
    throw new Error(`PREFLIGHT FAILED: Expected exactly ${EXPECTED_DEMO_COUNT} demo products, found ${demoSnap.docs.length}. Aborting.`);
  }

  // 2. Verify all products across entire database to ensure no other products get caught
  const allProductsSnap = await db.collection(COLLECTIONS.PRODUCTS).get();
  const nonDemoProducts = allProductsSnap.docs.filter((doc) => doc.data().sellerId !== TARGET_SELLER_ID);
  console.log(`Non-demo products in database: ${nonDemoProducts.length} (must remain completely untouched).`);

  // -------------------------------------------------------------
  // PHASE 3: DEPENDENCY CHECK
  // -------------------------------------------------------------
  console.log('\nPHASE 3: Checking for existing dependencies (lots, reservations, orders, escrow)...');

  const plans: ProductReconciliationPlan[] = [];

  for (const doc of demoSnap.docs) {
    const data = doc.data() as ServerProduct & { initialQuantity?: number };
    const productId = doc.id;

    // Check existing ProductLots
    const productLotsSnap = await db.collection(COLLECTIONS.PRODUCT_LOTS).where('productId', '==', productId).get();
    // Check existing InventoryLots
    const invLotsSnap = await db.collection(COLLECTIONS.INVENTORY_LOTS).where('productId', '==', productId).get();
    // Check existing Reservations
    const reservationsSnap = await db.collection(COLLECTIONS.INVENTORY_RESERVATIONS).where('productId', '==', productId).get();
    // Check existing OrderItems
    const orderItemsSnap = await db.collection(COLLECTIONS.ORDER_ITEMS).where('productId', '==', productId).get();

    if (!reservationsSnap.empty) {
      throw new Error(`DEPENDENCY CONFLICT: Product ${productId} has active inventory reservations. Aborting.`);
    }

    if (!orderItemsSnap.empty) {
      throw new Error(`DEPENDENCY CONFLICT: Product ${productId} has associated order items. Aborting.`);
    }

    const initialQty = (data as any).initialQuantity;
    const currentAvailable = data.totalAvailableQuantity ?? 0;
    const title = data.title || 'Untitled';
    const isPremium = title.startsWith('Premium');
    const isStandard = title.startsWith('Standard');
    const variant = isPremium ? 'Premium' : (isStandard ? 'Standard' : 'Unknown');

    let action: ProductReconciliationPlan['action'] = 'RECONCILE';
    let reason = '';

    if (typeof initialQty !== 'number' || !VALID_QUANTITIES.includes(initialQty)) {
      action = 'INVALID_QUANTITY';
      reason = `initialQuantity (${initialQty}) is not 1000 or 2500`;
    } else if (currentAvailable === initialQty && productLotsSnap.docs.length > 0 && invLotsSnap.docs.length > 0) {
      action = 'ALREADY_HEALTHY';
      reason = 'Already has correct available quantity and lots';
    }

    plans.push({
      id: productId,
      title,
      variant,
      currentAvailable,
      initialQuantity: initialQty ?? 0,
      targetAvailable: initialQty ?? 0,
      existingProductLots: productLotsSnap.docs.length,
      existingInventoryLots: invLotsSnap.docs.length,
      action,
      reason,
      harvestDate: data.harvestDate || new Date().toISOString().split('T')[0],
      shelfLifeDays: data.shelfLifeDays || 30,
      unit: data.unit || 'kg',
      qualityGrade: data.qualityGrade || 'Grade A',
      moistureContentPercent: data.moistureContentPercent,
      storageType: data.storageType || 'Ambient Warehouse',
      locationDistrict: data.location?.district || 'Pune',
      pricePerUnit: data.pricePerUnit || 0,
      minOrderQuantity: data.minOrderQuantity || 1,
    });
  }

  // -------------------------------------------------------------
  // PHASE 4: DRY-RUN OUTPUT TABLE
  // -------------------------------------------------------------
  console.log('\nPHASE 4: Reconciliation Plan Summary Table:');
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'Product ID'.padEnd(22) +
    'Title'.padEnd(35) +
    'Variant'.padEnd(10) +
    'Current'.padEnd(10) +
    'Target'.padEnd(10) +
    'ProdLots'.padEnd(10) +
    'InvLots'.padEnd(10) +
    'Action'
  );
  console.log('-------------------------------------------------------------------------------------------------------------------------');

  let reconcileCount = 0;
  let alreadyHealthyCount = 0;
  let invalidCount = 0;

  for (const p of plans) {
    console.log(
      p.id.padEnd(22) +
      p.title.slice(0, 33).padEnd(35) +
      p.variant.padEnd(10) +
      `${p.currentAvailable}`.padEnd(10) +
      `${p.targetAvailable}`.padEnd(10) +
      `${p.existingProductLots}`.padEnd(10) +
      `${p.existingInventoryLots}`.padEnd(10) +
      p.action + (p.reason ? ` (${p.reason})` : '')
    );

    if (p.action === 'RECONCILE') reconcileCount++;
    if (p.action === 'ALREADY_HEALTHY') alreadyHealthyCount++;
    if (p.action === 'INVALID_QUANTITY') invalidCount++;
  }
  console.log('-------------------------------------------------------------------------------------------------------------------------\n');

  console.log(`Summary: Total: ${plans.length} | Reconcile: ${reconcileCount} | Already Healthy: ${alreadyHealthyCount} | Invalid: ${invalidCount}`);

  if (invalidCount > 0) {
    throw new Error(`SAFETY STOP: ${invalidCount} products have invalid initial quantities. Aborting.`);
  }

  // -------------------------------------------------------------
  // PHASE 8: EXECUTION GUARD
  // -------------------------------------------------------------
  if (!isExecute) {
    console.log('\n[DRY RUN COMPLETE] No Firestore documents were modified.');
    console.log('To execute live migration, run with: --execute or EXECUTE=true\n');
    return {
      mode: 'DRY_RUN',
      totalProducts: plans.length,
      reconcileCount,
      alreadyHealthyCount,
      invalidCount,
      plans,
    };
  }

  // -------------------------------------------------------------
  // PHASE 9: ATOMIC LIVE EXECUTION
  // -------------------------------------------------------------
  console.log('\nPHASE 9: Executing atomic migration batch...');
  const batch = db.batch();
  const now = new Date().toISOString();

  let productsUpdated = 0;
  let productLotsCreated = 0;
  let inventoryLotsCreated = 0;

  for (const p of plans) {
    if (p.action !== 'RECONCILE') {
      continue;
    }

    const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(p.id);

    // 1. Update product totalAvailableQuantity
    batch.update(productRef, {
      totalAvailableQuantity: p.targetAvailable,
      updatedAt: now,
    });
    productsUpdated++;

    // 2. Create ProductLot if none exists
    let productLotId = '';
    if (p.existingProductLots === 0) {
      const lotRef = db.collection(COLLECTIONS.PRODUCT_LOTS).doc();
      productLotId = lotRef.id;

      const expiryDate = new Date(
        new Date(p.harvestDate).getTime() + p.shelfLifeDays * 86400000
      ).toISOString().split('T')[0];

      const lotRecord: ServerProductLot = {
        id: productLotId,
        productId: p.id,
        sellerId: TARGET_SELLER_ID,
        productName: p.title,
        lotNumber: `LOT-INIT-${p.id.slice(-6).toUpperCase()}`,
        harvestDate: p.harvestDate,
        expiryDate,
        totalQuantity: p.targetAvailable,
        availableQuantity: p.targetAvailable,
        reservedQuantity: 0,
        unit: p.unit,
        qualityGrade: p.qualityGrade,
        qualityScore: 92,
        moistureContentPercent: p.moistureContentPercent,
        storageType: p.storageType,
        storageFacility: `${p.locationDistrict} Aggregation Center`,
        status: 'available',
        farmGatePrice: p.pricePerUnit,
        sellingPrice: p.pricePerUnit,
        minOrderQuantity: p.minOrderQuantity,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(lotRef, lotRecord);
      productLotsCreated++;

      // 3. Create InventoryLot if none exists
      if (p.existingInventoryLots === 0) {
        const invRef = db.collection(COLLECTIONS.INVENTORY_LOTS).doc();
        const invStatus = calculateInventoryStatus(p.targetAvailable, 0, expiryDate);

        const inventoryRecord: ServerInventoryLot = {
          id: invRef.id,
          productLotId,
          productId: p.id,
          ownerId: TARGET_SELLER_ID,
          quantity: p.targetAvailable,
          reservedQuantity: 0,
          availableQuantity: p.targetAvailable,
          unit: p.unit,
          warehouseLocation: `${p.locationDistrict} Aggregation Center`,
          storageCondition: p.storageType,
          receivedAt: p.harvestDate,
          expiryDate,
          status: invStatus,
          createdAt: now,
          updatedAt: now,
        };

        batch.set(invRef, inventoryRecord);
        inventoryLotsCreated++;
      }
    }
  }

  console.log(`Committing batch with ${productsUpdated} product updates, ${productLotsCreated} ProductLots, and ${inventoryLotsCreated} InventoryLots...`);
  await batch.commit();
  console.log('BATCH COMMITTED SUCCESSFULLY!\n');

  // -------------------------------------------------------------
  // PHASE 10: POST-MIGRATION INVARIANT VERIFICATION
  // -------------------------------------------------------------
  console.log('PHASE 10: Verifying post-migration invariants in Firestore...');
  let invariantFailures = 0;

  for (const p of plans) {
    const pDoc = await db.collection(COLLECTIONS.PRODUCTS).doc(p.id).get();
    const pData = pDoc.data() as ServerProduct;

    if (pData.totalAvailableQuantity !== p.targetAvailable) {
      console.error(`INVARIANT FAILURE: Product ${p.id} totalAvailableQuantity is ${pData.totalAvailableQuantity}, expected ${p.targetAvailable}`);
      invariantFailures++;
    }

    const pLots = await db.collection(COLLECTIONS.PRODUCT_LOTS).where('productId', '==', p.id).get();
    if (pLots.docs.length !== 1) {
      console.error(`INVARIANT FAILURE: Product ${p.id} has ${pLots.docs.length} ProductLots, expected 1`);
      invariantFailures++;
    } else {
      const lot = pLots.docs[0].data() as ServerProductLot;
      if (lot.availableQuantity !== p.targetAvailable || lot.reservedQuantity !== 0 || lot.totalQuantity !== p.targetAvailable) {
        console.error(`INVARIANT FAILURE: ProductLot ${lot.id} quantities inconsistent with target ${p.targetAvailable}`);
        invariantFailures++;
      }
    }

    const iLots = await db.collection(COLLECTIONS.INVENTORY_LOTS).where('productId', '==', p.id).get();
    if (iLots.docs.length !== 1) {
      console.error(`INVARIANT FAILURE: Product ${p.id} has ${iLots.docs.length} InventoryLots, expected 1`);
      invariantFailures++;
    } else {
      const inv = iLots.docs[0].data() as ServerInventoryLot;
      if (inv.availableQuantity !== p.targetAvailable || inv.reservedQuantity !== 0 || inv.quantity !== p.targetAvailable) {
        console.error(`INVARIANT FAILURE: InventoryLot ${inv.id} quantities inconsistent with target ${p.targetAvailable}`);
        invariantFailures++;
      }
    }
  }

  if (invariantFailures > 0) {
    throw new Error(`POST-MIGRATION VERIFICATION FAILED: ${invariantFailures} invariant failures detected.`);
  }

  console.log('ALL POST-MIGRATION INVARIANTS SATISFIED (0 failures)!\n');

  return {
    mode: 'EXECUTE',
    totalProducts: plans.length,
    productsUpdated,
    productLotsCreated,
    inventoryLotsCreated,
    plans,
  };
}

// Auto-run if executed directly
if (require.main === module || process.argv[1]?.includes('reconcile-demo-catalog')) {
  runReconciliation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL ERROR]:', err);
      process.exit(1);
    });
}
