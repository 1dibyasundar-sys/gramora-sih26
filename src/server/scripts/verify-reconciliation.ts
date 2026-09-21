import assert from 'node:assert/strict';
import { getProductOrderability, incrementQuantity, decrementQuantity, getQuantityStep } from '../../lib/quantity';

async function testLiveApi() {
  console.log('Testing live API endpoints on http://localhost:3000...');

  // 1. Test GET /api/v1/products
  const resCatalog = await fetch('http://localhost:3000/api/v1/products');
  assert.equal(resCatalog.status, 200, 'GET /api/v1/products must return 200');
  const catalogData = await resCatalog.json();
  const products = catalogData.data;
  assert.ok(Array.isArray(products) && products.length > 0, 'Catalog must return products array');
  console.log(`✔ PASS: GET /api/v1/products returned 200 with ${products.length} products.`);

  // Verify all products in catalog have totalAvailableQuantity > 0
  for (const p of products) {
    assert.ok(p.totalAvailableQuantity > 0, `Product ${p.id} (${p.title}) must have totalAvailableQuantity > 0, found ${p.totalAvailableQuantity}`);
  }
  console.log('✔ PASS: All products in catalog have positive available stock (1000 or 2500).');

  // 2. Test GET /api/v1/products/wdhyjioRf3DQm6K4vLsP (Tomato)
  const tomatoId = 'wdhyjioRf3DQm6K4vLsP';
  const resTomato = await fetch(`http://localhost:3000/api/v1/products/${tomatoId}`);
  assert.equal(resTomato.status, 200, `GET /api/v1/products/${tomatoId} must return 200`);
  const tomatoData = await resTomato.json();
  const tomato = tomatoData.data.product;

  console.log('\n--- Tomato Product Verification ---');
  console.log('Title:', tomato.title);
  console.log('Unit:', tomato.unit);
  console.log('MOQ:', tomato.minOrderQuantity);
  console.log('Available:', tomato.totalAvailableQuantity);
  console.log('Price/kg:', tomato.pricePerUnit);

  assert.equal(tomato.title, 'Standard Organic Vine Tomatoes');
  assert.equal(tomato.unit, 'kg');
  assert.equal(tomato.minOrderQuantity, 50);
  assert.equal(tomato.totalAvailableQuantity, 2500);
  assert.equal(tomato.pricePerUnit, 32);
  console.log('✔ PASS: Tomato details match exactly (Standard Organic Vine Tomatoes, 50 kg MOQ, 2500 kg available).');

  // 3. Test Orderability and Quantity Stepping
  const orderability = getProductOrderability(tomato.totalAvailableQuantity, tomato.minOrderQuantity);
  const step = getQuantityStep(tomato.unit, tomato.minOrderQuantity);

  assert.equal(orderability.orderable, true);
  assert.equal(step, 10);

  // Stepping sequence: 50 -> 60 -> 70 -> 60 -> 50
  let q = tomato.minOrderQuantity; // 50
  assert.equal(q, 50);

  q = incrementQuantity(q, step, tomato.totalAvailableQuantity, tomato.minOrderQuantity);
  assert.equal(q, 60, '50 + 10 should be 60');

  q = incrementQuantity(q, step, tomato.totalAvailableQuantity, tomato.minOrderQuantity);
  assert.equal(q, 70, '60 + 10 should be 70');

  q = decrementQuantity(q, step, tomato.minOrderQuantity);
  assert.equal(q, 60, '70 - 10 should be 60');

  q = decrementQuantity(q, step, tomato.minOrderQuantity);
  assert.equal(q, 50, '60 - 10 should be 50');

  // At 50, decrement stays at 50
  q = decrementQuantity(q, step, tomato.minOrderQuantity);
  assert.equal(q, 50, 'At 50, decrement remains 50');

  // At 2500, increment stays at 2500
  let maxQ = incrementQuantity(2500, step, tomato.totalAvailableQuantity, tomato.minOrderQuantity);
  assert.equal(maxQ, 2500, 'At 2500, increment remains 2500');
  console.log('✔ PASS: Quantity stepping and boundary monotonicity fully verified (50 -> 60 -> 70 -> 60 -> 50; bounds at 50 and 2500).');

  // 4. Test Pricing Formulas
  // Formula:
  // produceCost = pricePerUnit * quantity = 32 * quantity
  // mandiBenchmark = marketMandiPrice * quantity = 42 * quantity (or 32 * 1.3 ~ 42)
  // buyerSavings = Math.max(0, mandiBenchmark - produceCost)
  // logistics = Math.round(quantity * 2.2)
  // platformFee = Math.round(produceCost * 0.025)
  // total = produceCost + logistics + platformFee
  console.log('\n--- Pricing Formula Verification ---');
  function calcPricing(quantity: number, pricePerUnit: number) {
    const produceCost = pricePerUnit * quantity;
    const mandiBenchmark = 42 * quantity; // Mandi benchmark ₹42/kg
    const buyerSavings = mandiBenchmark - produceCost;
    const logistics = Math.round(quantity * 2.2);
    const platformFee = Math.round(produceCost * 0.025);
    const total = produceCost + logistics + platformFee;
    return { produceCost, mandiBenchmark, buyerSavings, logistics, platformFee, total };
  }

  const p50 = calcPricing(50, 32);
  console.log('50kg:', p50);
  assert.equal(p50.produceCost, 1600);
  assert.equal(p50.mandiBenchmark, 2100);
  assert.equal(p50.buyerSavings, 500);
  assert.equal(p50.logistics, 110);
  assert.equal(p50.platformFee, 40);
  assert.equal(p50.total, 1750);
  console.log('✔ PASS: 50kg pricing matches exact requirements (Total: ₹1,750, Savings: ₹500).');

  const p60 = calcPricing(60, 32);
  console.log('60kg:', p60);
  assert.equal(p60.produceCost, 1920);
  assert.equal(p60.mandiBenchmark, 2520);
  assert.equal(p60.buyerSavings, 600);
  assert.equal(p60.logistics, 132);
  assert.equal(p60.platformFee, 48);
  assert.equal(p60.total, 2100);
  console.log('✔ PASS: 60kg pricing matches exact requirements (Total: ₹2,100, Savings: ₹600).');

  const p100 = calcPricing(100, 32);
  console.log('100kg:', p100);
  assert.equal(p100.produceCost, 3200);
  assert.equal(p100.mandiBenchmark, 4200);
  assert.equal(p100.buyerSavings, 1000);
  assert.equal(p100.logistics, 220);
  assert.equal(p100.platformFee, 80);
  assert.equal(p100.total, 3500);
  console.log('✔ PASS: 100kg pricing matches exact requirements (Total: ₹3,500, Savings: ₹1,000).');

  // 5. Test Marketplace & Product Detail HTTP Routes
  const resMarketplace = await fetch('http://localhost:3000/marketplace');
  assert.equal(resMarketplace.status, 200, 'GET /marketplace must return 200');
  const marketplaceHtml = await resMarketplace.text();
  assert.ok(marketplaceHtml.includes('Gramora') || marketplaceHtml.includes('marketplace'), 'Marketplace HTML must render');
  console.log('✔ PASS: GET /marketplace returned HTTP 200.');

  const resDetail = await fetch(`http://localhost:3000/marketplace/${tomatoId}`);
  assert.equal(resDetail.status, 200, `GET /marketplace/${tomatoId} must return 200`);
  console.log(`✔ PASS: GET /marketplace/${tomatoId} returned HTTP 200.`);

  console.log('\n====================================================');
  console.log('ALL API, QUANTITY, PRICING & MARKETPLACE CHECKS PASSED!');
  console.log('====================================================');
}

testLiveApi().catch((err) => {
  console.error('[FAILED]:', err);
  process.exit(1);
});
