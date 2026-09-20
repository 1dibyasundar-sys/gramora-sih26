/**
 * ORDER DOMAIN UNIT TEST SUITE
 * Tests OrderStateMachine, OrderTotalCalculator, and domain validation schemas.
 */

import assert from 'node:assert/strict';
import { OrderStateMachine } from '../services/order-state-machine';
import { OrderTotalCalculator } from '../services/order-total-calculator';
import {
  CheckoutRequestSchema,
  CancelOrderSchema,
  OrderQuerySchema,
  ServerOrderStatus,
} from '../domain/order';
import { AppError } from '../lib/errors';

async function runOrderDomainTests() {
  console.log('====================================================');
  console.log('STARTING ORDER DOMAIN UNIT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;

  // TEST 1: OrderStateMachine valid linear transitions
  console.log('TEST 1: OrderStateMachine valid status transitions');
  assert.equal(OrderStateMachine.canTransition('created', 'payment_pending'), true);
  assert.equal(OrderStateMachine.canTransition('payment_pending', 'escrow_funded'), true);
  assert.equal(OrderStateMachine.canTransition('escrow_funded', 'processing'), true);
  assert.equal(OrderStateMachine.canTransition('processing', 'dispatched'), true);
  assert.equal(OrderStateMachine.canTransition('dispatched', 'delivered'), true);
  assert.equal(OrderStateMachine.canTransition('delivered', 'completed'), true);
  console.log('✔ Passed: Canonical linear transitions are valid.');
  passed++;

  // TEST 2: OrderStateMachine cancellation transitions
  console.log('TEST 2: OrderStateMachine cancellation transitions');
  assert.equal(OrderStateMachine.canTransition('created', 'cancelled'), true);
  assert.equal(OrderStateMachine.canTransition('payment_pending', 'cancelled'), true);
  assert.equal(OrderStateMachine.canTransition('escrow_funded', 'cancelled'), true);
  assert.equal(OrderStateMachine.canTransition('processing', 'cancelled'), true);
  console.log('✔ Passed: Pre-dispatch statuses are cancellable.');
  passed++;

  // TEST 3: OrderStateMachine invalid / forbidden transitions
  console.log('TEST 3: OrderStateMachine invalid / forbidden transitions');
  assert.equal(OrderStateMachine.canTransition('created', 'delivered'), false);
  assert.equal(OrderStateMachine.canTransition('dispatched', 'cancelled'), false);
  assert.equal(OrderStateMachine.canTransition('delivered', 'cancelled'), false);
  assert.equal(OrderStateMachine.canTransition('completed', 'cancelled'), false);
  assert.equal(OrderStateMachine.canTransition('cancelled', 'completed'), false);
  assert.equal(OrderStateMachine.canTransition('created', 'created'), false);

  assert.throws(
    () => OrderStateMachine.assertCanTransition('completed', 'cancelled'),
    (err: unknown) => {
      return err instanceof AppError && err.statusCode === 409 && err.code === 'INVALID_STATUS_TRANSITION';
    }
  );
  console.log('✔ Passed: Illegal transitions properly rejected with 409 INVALID_STATUS_TRANSITION.');
  passed++;

  // TEST 4: Terminal and Cancellable status helpers
  console.log('TEST 4: Terminal and Cancellable status queries');
  assert.equal(OrderStateMachine.isTerminal('completed'), true);
  assert.equal(OrderStateMachine.isTerminal('cancelled'), true);
  assert.equal(OrderStateMachine.isTerminal('payment_pending'), false);

  assert.equal(OrderStateMachine.isCancellable('payment_pending'), true);
  assert.equal(OrderStateMachine.isCancellable('completed'), false);
  assert.equal(OrderStateMachine.isCancellable('cancelled'), false);
  console.log('✔ Passed: Terminal and Cancellable helper rules verified.');
  passed++;

  // TEST 5: OrderTotalCalculator integer paise arithmetic
  console.log('TEST 5: OrderTotalCalculator integer paise arithmetic');
  // 100 kg at ₹45.50 per kg (4550 paise)
  const lineTotal = OrderTotalCalculator.calculateLineTotalMinor(100, 4550);
  assert.equal(lineTotal, 455000); // 4,55,000 paise = ₹4550.00
  assert.equal(Number.isInteger(lineTotal), true);

  const breakdown = OrderTotalCalculator.calculateOrderTotals([
    { quantity: 100, unit: 'kg', pricePerUnitMinor: 4550 },
  ]);

  // Subtotal = 455000 paise
  assert.equal(breakdown.subtotalMinor, 455000);
  // Freight = 100 kg * 220 paise/kg = 22000 paise (₹220.00)
  assert.equal(breakdown.shippingFeeMinor, 22000);
  // Platform fee = 2.5% of 455000 = 11375 paise (₹113.75)
  assert.equal(breakdown.platformFeeMinor, 11375);
  // Total = 455000 + 22000 + 11375 = 488375 paise (₹4883.75)
  assert.equal(breakdown.totalMinor, 488375);
  assert.equal(breakdown.totalAmount, 4883.75);
  assert.equal(breakdown.subtotal, 4550.0);
  assert.equal(breakdown.logisticsFee, 220.0);
  assert.equal(breakdown.platformFee, 113.75);
  console.log('✔ Passed: Zero-drift integer minor unit financial calculations verified.');
  passed++;

  // TEST 6: Unit weight multiplier normalization
  console.log('TEST 6: Unit weight multipliers');
  assert.equal(OrderTotalCalculator.getUnitWeightMultiplier('kg'), 1);
  assert.equal(OrderTotalCalculator.getUnitWeightMultiplier('quintal'), 100);
  assert.equal(OrderTotalCalculator.getUnitWeightMultiplier('tonne'), 1000);
  assert.equal(OrderTotalCalculator.getUnitWeightMultiplier('crate'), 20);
  console.log('✔ Passed: Produce unit weight multipliers properly mapped.');
  passed++;

  // TEST 7: CheckoutRequestSchema validation
  console.log('TEST 7: CheckoutRequestSchema validation');
  const validPayload = {
    items: [{ productId: 'prod-onion-101', quantity: 50 }],
    shippingAddress: {
      name: 'Priya Sharma',
      phone: '+919876543210',
      addressLine1: '42 Sector 14, Vashi Market Yard',
      district: 'Navi Mumbai',
      state: 'Maharashtra',
      postalCode: '400703',
    },
  };
  const parsed = CheckoutRequestSchema.parse(validPayload);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.shippingAddress.postalCode, '400703');

  // Reject empty items
  assert.throws(() => CheckoutRequestSchema.parse({ ...validPayload, items: [] }));
  // Reject negative quantity
  assert.throws(() =>
    CheckoutRequestSchema.parse({
      ...validPayload,
      items: [{ productId: 'prod-onion-101', quantity: -10 }],
    })
  );
  // Reject invalid postal code
  assert.throws(() =>
    CheckoutRequestSchema.parse({
      ...validPayload,
      shippingAddress: { ...validPayload.shippingAddress, postalCode: 'ABC123' },
    })
  );
  console.log('✔ Passed: CheckoutRequestSchema enforces strict validation.');
  passed++;

  // TEST 8: CancelOrderSchema validation
  console.log('TEST 8: CancelOrderSchema validation');
  const cancelValid = CancelOrderSchema.parse({ reason: 'Procurement schedule postponed' });
  assert.equal(cancelValid.reason, 'Procurement schedule postponed');

  // Reject excessively long reason
  assert.throws(() => CancelOrderSchema.parse({ reason: 'A'.repeat(301) }));
  console.log('✔ Passed: CancelOrderSchema validation verified.');
  passed++;

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${passed} ORDER DOMAIN UNIT TESTS PASSED!`);
  console.log('====================================================\n');
}

runOrderDomainTests().catch((err) => {
  console.error('Order Domain Test Suite Failed:', err);
  process.exit(1);
});
