export interface CalculatedOrderItem {
  productId: string;
  quantity: number;
  unit: string;
  pricePerUnitMinor: number;
  lineTotalMinor: number;
}

export interface OrderTotalBreakdown {
  subtotalMinor: number;
  shippingFeeMinor: number;
  platformFeeMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  // Standard rupee equivalents (minor / 100)
  subtotal: number;
  logisticsFee: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
}

export class OrderTotalCalculator {
  /**
   * Normalizes unit to approximate weight in kilograms.
   */
  static getUnitWeightMultiplier(unit: string): number {
    const normalized = unit.toLowerCase().trim();
    switch (normalized) {
      case 'kg':
        return 1;
      case 'quintal':
        return 100;
      case 'tonne':
      case 'ton':
        return 1000;
      case 'crate':
        return 20;
      case 'box':
        return 10;
      default:
        return 1;
    }
  }

  /**
   * Calculates individual line item total strictly in integer paise.
   */
  static calculateLineTotalMinor(quantity: number, pricePerUnitMinor: number): number {
    const lineTotal = Math.round(quantity * pricePerUnitMinor);
    if (!Number.isInteger(lineTotal) || lineTotal < 0) {
      throw new Error(`Invalid line item total calculated: ${lineTotal}`);
    }
    return lineTotal;
  }

  /**
   * Calculates complete order financial breakdown in integer minor units (paise).
   */
  static calculateOrderTotals(
    items: Array<{ quantity: number; unit: string; pricePerUnitMinor: number }>
  ): OrderTotalBreakdown {
    let subtotalMinor = 0;
    let totalWeightKg = 0;

    for (const item of items) {
      const lineTotal = this.calculateLineTotalMinor(item.quantity, item.pricePerUnitMinor);
      subtotalMinor += lineTotal;

      const unitMultiplier = this.getUnitWeightMultiplier(item.unit);
      totalWeightKg += item.quantity * unitMultiplier;
    }

    // 1. Logistics Cold-Chain Freight: ₹2.20/kg = 220 paise/kg
    const shippingFeeMinor = Math.round(totalWeightKg * 220);

    // 2. Digital Quality & Escrow Fee: 2.5% of produce subtotal
    const platformFeeMinor = Math.round(subtotalMinor * 0.025);

    // 3. Indian GST for primary unprocessed agricultural produce is exempt (0%)
    const taxMinor = 0;

    // 4. No arbitrary discounts at server level
    const discountMinor = 0;

    // 5. Grand Total in minor units
    const totalMinor = subtotalMinor + shippingFeeMinor + platformFeeMinor + taxMinor - discountMinor;

    if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
      throw new Error(`Invalid grand total computed: ${totalMinor} paise.`);
    }

    return {
      subtotalMinor,
      shippingFeeMinor,
      platformFeeMinor,
      taxMinor,
      discountMinor,
      totalMinor,
      subtotal: Math.round(subtotalMinor) / 100,
      logisticsFee: Math.round(shippingFeeMinor) / 100,
      platformFee: Math.round(platformFeeMinor) / 100,
      tax: Math.round(taxMinor) / 100,
      totalAmount: Math.round(totalMinor) / 100,
    };
  }

  /**
   * Converts paise to standard rupees.
   */
  static toRupees(paise: number): number {
    return Math.round(paise) / 100;
  }

  /**
   * Converts rupees to integer paise.
   */
  static toPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }
}
