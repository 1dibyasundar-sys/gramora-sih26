/**
 * Authoritative Firestore collection name constants.
 */
export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  PRODUCT_LOTS: 'productLots',
  INVENTORY_LOTS: 'inventoryLots',
  ORDERS: 'orders',
  ORDER_ITEMS: 'orderItems',
  INVENTORY_RESERVATIONS: 'inventoryReservations',
  ESCROW_LEDGERS: 'escrowLedgers',
  ESCROW_TRANSACTIONS: 'escrowTransactions',
  IDEMPOTENCY_KEYS: 'idempotencyKeys',
  ORDER_EVENTS: 'orderEvents',
  DELIVERIES: 'deliveries',
  ROUTES: 'routes',
  FORECASTS: 'forecasts',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  PAYMENTS: 'payments',
  PAYMENT_WEBHOOK_EVENTS: 'paymentWebhookEvents',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
