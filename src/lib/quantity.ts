/**
 * Quantity and Inventory Business Logic Utilities
 * Gramora Smart Agri Marketplace
 */

export type OrderabilityStatus =
  | { orderable: true }
  | { orderable: false; reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' };

/**
 * Returns the increment/decrement step for a given commodity unit and MOQ.
 * Default is 10 for 'kg' when MOQ >= 10, or 1 for other units / small MOQs.
 */
export function getQuantityStep(unit: string, moq: number = 1): number {
  const normalizedUnit = (unit || '').toLowerCase().trim();
  if (normalizedUnit === 'kg') {
    return moq < 10 ? 1 : 10;
  }
  return 1;
}

/**
 * Evaluates whether a product can be ordered given its available stock and MOQ.
 */
export function getProductOrderability(
  availableStock: number,
  minOrderQuantity: number
): OrderabilityStatus {
  const stock = typeof availableStock === 'number' && !isNaN(availableStock) ? availableStock : 0;
  const moq = typeof minOrderQuantity === 'number' && !isNaN(minOrderQuantity) ? minOrderQuantity : 1;

  if (stock <= 0) {
    return { orderable: false, reason: 'OUT_OF_STOCK' };
  }

  if (stock < moq) {
    return { orderable: false, reason: 'INSUFFICIENT_STOCK' };
  }

  return { orderable: true };
}

/**
 * Calculates the next quantity when increasing (+).
 * Strictly guarantees:
 * 1. result >= current
 * 2. result <= availableStock
 * 3. result >= minOrderQuantity
 * 4. result is integer
 */
export function incrementQuantity(
  current: number,
  step: number,
  availableStock: number,
  minOrderQuantity: number
): number {
  const status = getProductOrderability(availableStock, minOrderQuantity);
  if (!status.orderable) {
    return 0;
  }

  const safeStep = Math.max(1, Math.floor(step));
  const safeCurrent = Math.max(minOrderQuantity, Math.floor(current || minOrderQuantity));
  const target = safeCurrent + safeStep;

  return Math.min(Math.floor(availableStock), target);
}

/**
 * Calculates the next quantity when decreasing (−).
 * Strictly guarantees:
 * 1. result <= current
 * 2. result >= minOrderQuantity
 * 3. result is integer
 */
export function decrementQuantity(
  current: number,
  step: number,
  minOrderQuantity: number
): number {
  const safeStep = Math.max(1, Math.floor(step));
  const safeCurrent = Math.floor(current || minOrderQuantity);
  const target = safeCurrent - safeStep;

  return Math.max(Math.floor(minOrderQuantity), target);
}

/**
 * Clamps and sanitizes user-typed input against MOQ and available stock.
 */
export function clampQuantity(
  rawInput: number | string,
  minOrderQuantity: number,
  availableStock: number
): number {
  const status = getProductOrderability(availableStock, minOrderQuantity);
  if (!status.orderable) {
    return 0;
  }

  const parsed = typeof rawInput === 'string' ? parseInt(rawInput, 10) : Math.floor(rawInput);
  if (isNaN(parsed) || parsed < minOrderQuantity) {
    return Math.floor(minOrderQuantity);
  }

  if (parsed > availableStock) {
    return Math.floor(availableStock);
  }

  return parsed;
}
