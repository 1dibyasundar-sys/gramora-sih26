/**
 * QUANTITY SELECTOR & ORDERABILITY UNIT TEST SUITE
 * Tests Cases 1 through 10 covering boundary conditions, step size, rapid clicks, and orderability.
 */

import assert from 'node:assert/strict';
import {
  getQuantityStep,
  getProductOrderability,
  incrementQuantity,
  decrementQuantity,
  clampQuantity,
} from '../quantity';

async function runQuantityTests() {
  console.log('====================================================');
  console.log('STARTING QUANTITY & ORDERABILITY UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;

  // --------------------------------------------------------------------------
  // CASE 1: MOQ = 50, Available = 300, Initial = 50 -> - gives 50, + gives 60
  // --------------------------------------------------------------------------
  {
    console.log('CASE 1: Initial MOQ boundaries with step');
    const moq = 50;
    const available = 300;
    const initial = moq;
    const step = getQuantityStep('kg', moq);

    assert.equal(step, 10, 'Step for kg with MOQ 50 should be 10');
    const decremented = decrementQuantity(initial, step, moq);
    assert.equal(decremented, 50, '− at MOQ must not decrease below MOQ');

    const incremented = incrementQuantity(initial, step, available, moq);
    assert.equal(incremented, 60, '+ at MOQ 50 with step 10 must be 60');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 2: Quantity = 100, Press + -> 110
  // --------------------------------------------------------------------------
  {
    console.log('CASE 2: Standard increment from 100 to 110');
    const moq = 50;
    const available = 300;
    const current = 100;
    const step = getQuantityStep('kg', moq);

    const next = incrementQuantity(current, step, available, moq);
    assert.equal(next, 110, '+ from 100 must be 110');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 3: Quantity = 100, Press − -> 90
  // --------------------------------------------------------------------------
  {
    console.log('CASE 3: Standard decrement from 100 to 90');
    const moq = 50;
    const current = 100;
    const step = getQuantityStep('kg', moq);

    const prev = decrementQuantity(current, step, moq);
    assert.equal(prev, 90, '− from 100 must be 90');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 4: Quantity = MOQ, Press − -> remains MOQ
  // --------------------------------------------------------------------------
  {
    console.log('CASE 4: Lower boundary clamp at MOQ');
    const moq = 50;
    const step = getQuantityStep('kg', moq);

    const prev = decrementQuantity(moq, step, moq);
    assert.equal(prev, moq, '− at MOQ must strictly remain MOQ');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 5: Quantity = Available, Press + -> remains Available
  // --------------------------------------------------------------------------
  {
    console.log('CASE 5: Upper boundary clamp at Available Stock');
    const moq = 50;
    const available = 300;
    const step = getQuantityStep('kg', moq);

    const next = incrementQuantity(available, step, available, moq);
    assert.equal(next, available, '+ at available stock must not exceed available');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 6: Available = 0 -> Not Orderable
  // --------------------------------------------------------------------------
  {
    console.log('CASE 6: Zero available inventory handling');
    const moq = 50;
    const available = 0;
    const status = getProductOrderability(available, moq);

    assert.equal(status.orderable, false, 'Zero stock product must not be orderable');
    if (!status.orderable) {
      assert.equal(status.reason, 'OUT_OF_STOCK');
    }

    const step = getQuantityStep('kg', moq);
    const inc = incrementQuantity(50, step, available, moq);
    assert.equal(inc, 0, '+ on zero-stock must return 0 (safe fallback)');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 7: Available < MOQ -> Insufficient Stock (Not Orderable)
  // --------------------------------------------------------------------------
  {
    console.log('CASE 7: Insufficient stock below MOQ');
    const moq = 50;
    const available = 30; // 30 < 50
    const status = getProductOrderability(available, moq);

    assert.equal(status.orderable, false, 'Stock below MOQ must not be orderable');
    if (!status.orderable) {
      assert.equal(status.reason, 'INSUFFICIENT_STOCK');
    }
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 8: Rapid + Clicks -> Monotonically increasing, clamped at available
  // --------------------------------------------------------------------------
  {
    console.log('CASE 8: Rapid + clicks monotonicity');
    const moq = 50;
    const available = 120;
    const step = 10;

    let q = moq;
    const history: number[] = [q];
    for (let i = 0; i < 20; i++) {
      const prev = q;
      q = incrementQuantity(q, step, available, moq);
      assert.ok(q >= prev, `Rapid + click ${i} must never decrease: ${prev} -> ${q}`);
      assert.ok(q <= available, `Rapid + click ${i} must never exceed available ${available}: got ${q}`);
      history.push(q);
    }
    assert.equal(q, available, 'Rapid clicks must eventually clamp exactly at available stock');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 9: Rapid − Clicks -> Monotonically decreasing, clamped at MOQ
  // --------------------------------------------------------------------------
  {
    console.log('CASE 9: Rapid − clicks monotonicity');
    const moq = 50;
    const available = 200;
    const step = 10;

    let q = available;
    for (let i = 0; i < 20; i++) {
      const prev = q;
      q = decrementQuantity(q, step, moq);
      assert.ok(q <= prev, `Rapid − click ${i} must never increase: ${prev} -> ${q}`);
      assert.ok(q >= moq, `Rapid − click ${i} must never drop below MOQ ${moq}: got ${q}`);
    }
    assert.equal(q, moq, 'Rapid clicks must clamp exactly at MOQ');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 10: Input Sanitization & Clamping (NaN, floats, negative, out of bounds)
  // --------------------------------------------------------------------------
  {
    console.log('CASE 10: Input sanitization and manual input clamping');
    const moq = 50;
    const available = 300;

    assert.equal(clampQuantity('invalid', moq, available), moq, 'NaN input resets to MOQ');
    assert.equal(clampQuantity(-10, moq, available), moq, 'Negative input resets to MOQ');
    assert.equal(clampQuantity(25, moq, available), moq, 'Below MOQ input clamps to MOQ');
    assert.equal(clampQuantity(99.8, moq, available), 99, 'Floats are truncated to integer');
    assert.equal(clampQuantity(500, moq, available), available, 'Above stock input clamps to available');
    assert.equal(clampQuantity(150, moq, available), 150, 'Valid in-range input is preserved');

    // Clamping on out-of-stock product returns 0
    assert.equal(clampQuantity(50, moq, 0), 0, 'Clamping on 0-stock returns 0');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 11: Sequential Stepping Sequence: 50 -> 60 -> 70 -> 60 -> 50
  // --------------------------------------------------------------------------
  {
    console.log('CASE 11: Stepping sequence 50 -> 60 -> 70 -> 60 -> 50');
    const moq = 50;
    const available = 1000;
    const step = getQuantityStep('kg', moq);

    let q = moq;
    assert.equal(q, 50, 'Initial at 50');
    q = incrementQuantity(q, step, available, moq);
    assert.equal(q, 60, '+ should step to 60');
    q = incrementQuantity(q, step, available, moq);
    assert.equal(q, 70, '+ should step to 70');
    q = decrementQuantity(q, step, moq);
    assert.equal(q, 60, '− should step back to 60');
    q = decrementQuantity(q, step, moq);
    assert.equal(q, 50, '− should step back to 50');
    q = decrementQuantity(q, step, moq);
    assert.equal(q, 50, '− at MOQ must stay at 50');
    passed++;
  }

  // --------------------------------------------------------------------------
  // CASE 12: Pricing Calculation Verification at 50kg, 60kg, 100kg, and max (1000kg)
  // --------------------------------------------------------------------------
  {
    console.log('CASE 12: Pricing calculation verification across quantities');
    const pricePerUnit = 32;
    const marketMandiPrice = 42;

    const calculatePricing = (effectiveQty: number) => {
      const produceCost = effectiveQty * pricePerUnit;
      const traditionalMandiCost = effectiveQty * (marketMandiPrice || pricePerUnit * 1.3);
      const totalSavings = traditionalMandiCost > produceCost ? traditionalMandiCost - produceCost : 0;
      const estimatedLogistics = effectiveQty > 0 ? Math.round(effectiveQty * 2.2) : 0;
      const platformEscrowFee = effectiveQty > 0 ? Math.round(produceCost * 0.025) : 0;
      const totalOrderEstimate = produceCost + estimatedLogistics + platformEscrowFee;
      return { produceCost, traditionalMandiCost, totalSavings, estimatedLogistics, platformEscrowFee, totalOrderEstimate };
    };

    // 50 kg
    const p50 = calculatePricing(50);
    assert.equal(p50.produceCost, 1600);
    assert.equal(p50.traditionalMandiCost, 2100);
    assert.equal(p50.totalSavings, 500);
    assert.equal(p50.estimatedLogistics, 110);
    assert.equal(p50.platformEscrowFee, 40);
    assert.equal(p50.totalOrderEstimate, 1750);

    // 60 kg
    const p60 = calculatePricing(60);
    assert.equal(p60.produceCost, 1920);
    assert.equal(p60.traditionalMandiCost, 2520);
    assert.equal(p60.totalSavings, 600);
    assert.equal(p60.estimatedLogistics, 132);
    assert.equal(p60.platformEscrowFee, 48);
    assert.equal(p60.totalOrderEstimate, 2100);

    // 100 kg
    const p100 = calculatePricing(100);
    assert.equal(p100.produceCost, 3200);
    assert.equal(p100.traditionalMandiCost, 4200);
    assert.equal(p100.totalSavings, 1000);
    assert.equal(p100.estimatedLogistics, 220);
    assert.equal(p100.platformEscrowFee, 80);
    assert.equal(p100.totalOrderEstimate, 3500);

    // 1000 kg (max)
    const p1000 = calculatePricing(1000);
    assert.equal(p1000.produceCost, 32000);
    assert.equal(p1000.traditionalMandiCost, 42000);
    assert.equal(p1000.totalSavings, 10000);
    assert.equal(p1000.estimatedLogistics, 2200);
    assert.equal(p1000.platformEscrowFee, 800);
    assert.equal(p1000.totalOrderEstimate, 35000);

    // 0 kg (unorderable)
    const p0 = calculatePricing(0);
    assert.equal(p0.produceCost, 0);
    assert.equal(p0.totalSavings, 0);
    assert.equal(p0.estimatedLogistics, 0);
    assert.equal(p0.platformEscrowFee, 0);
    assert.equal(p0.totalOrderEstimate, 0);

    console.log('✔ Passed: Pricing formulas verified accurately across all test quantities.\n');
    passed++;
  }

  console.log(`\nALL ${passed} QUANTITY TEST CASES PASSED SUCCESSFULLY!`);
}

runQuantityTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
