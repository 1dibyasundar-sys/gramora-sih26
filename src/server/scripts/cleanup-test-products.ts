/**
 * Cleanup script to remove test-polluted products and their associated lots.
 * By default, this runs in dry-run mode. Pass --execute to actually delete.
 */

import { getFirestore } from '../lib/firebase-admin';
import { COLLECTIONS } from '../repositories/collections';
import { parseArgs } from 'util';

async function cleanupTestProducts() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      execute: {
        type: 'boolean',
        short: 'e',
      },
      'dry-run': {
        type: 'boolean',
      },
    },
  });

  const isDryRun = !values.execute;
  const db = getFirestore();

  console.log(`\n=== CLEANUP TEST PRODUCTS ${isDryRun ? '(DRY RUN)' : '(EXECUTE)'} ===`);
  
  const productsSnap = await db.collection(COLLECTIONS.PRODUCTS).get();
  const testProducts: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  productsSnap.forEach(doc => {
    const data = doc.data();
    const imgs: string[] = Array.isArray(data.images) ? data.images : [];
    
    // Valid production products must have Cloudinary images
    const hasCloudinary = imgs.some(url => url.includes('res.cloudinary.com'));
    
    if (!hasCloudinary) {
      testProducts.push(doc);
    }
  });

  console.log(`Found ${testProducts.length} test-polluted products out of ${productsSnap.size} total products.`);

  if (testProducts.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  let deletedProducts = 0;
  let deletedProductLots = 0;
  let deletedInventoryLots = 0;

  for (const doc of testProducts) {
    const productId = doc.id;
    console.log(`\nAnalyzing product: ${productId} (${doc.data().title})`);

    // Find associated lots
    const productLotsSnap = await db.collection(COLLECTIONS.PRODUCT_LOTS).where('productId', '==', productId).get();
    const inventoryLotsSnap = await db.collection(COLLECTIONS.INVENTORY_LOTS).where('productId', '==', productId).get();

    console.log(`  - Found ${productLotsSnap.size} associated product lots`);
    console.log(`  - Found ${inventoryLotsSnap.size} associated inventory lots`);

    if (!isDryRun) {
      const batch = db.batch();
      
      batch.delete(doc.ref);
      productLotsSnap.forEach(lotDoc => batch.delete(lotDoc.ref));
      inventoryLotsSnap.forEach(invDoc => batch.delete(invDoc.ref));
      
      await batch.commit();
      console.log(`  [DELETED] Product ${productId} and its associated lots.`);
    } else {
      console.log(`  [DRY RUN] Would delete product ${productId} and its lots.`);
    }

    deletedProducts++;
    deletedProductLots += productLotsSnap.size;
    deletedInventoryLots += inventoryLotsSnap.size;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Products ${isDryRun ? 'to delete' : 'deleted'}: ${deletedProducts}`);
  console.log(`Product Lots ${isDryRun ? 'to delete' : 'deleted'}: ${deletedProductLots}`);
  console.log(`Inventory Lots ${isDryRun ? 'to delete' : 'deleted'}: ${deletedInventoryLots}`);
  
  if (isDryRun) {
    console.log('\nThis was a DRY RUN. No data was actually deleted.');
    console.log('Run with npm run cleanup:test-products -- --execute to perform deletion.');
  } else {
    console.log('\nCLEANUP COMPLETED SUCCESSFULLY.');
  }
}

cleanupTestProducts().catch(console.error);
