import { ServerOrderStatus } from '../domain/order';
import { AppError } from '../lib/errors';

/**
 * Valid transitions mapping for canonical order statuses.
 */
const VALID_ORDER_TRANSITIONS: Record<ServerOrderStatus, ReadonlySet<ServerOrderStatus>> = {
  created: new Set<ServerOrderStatus>(['payment_pending', 'cancelled']),
  payment_pending: new Set<ServerOrderStatus>(['escrow_funded', 'cancelled']),
  escrow_funded: new Set<ServerOrderStatus>(['processing', 'cancelled']),
  processing: new Set<ServerOrderStatus>(['dispatched', 'cancelled']),
  dispatched: new Set<ServerOrderStatus>(['delivered']),
  delivered: new Set<ServerOrderStatus>(['completed']),
  completed: new Set<ServerOrderStatus>(), // Terminal
  cancelled: new Set<ServerOrderStatus>(), // Terminal
};

export class OrderStateMachine {
  /**
   * Verifies whether a given state transition is logically permitted.
   */
  static canTransition(from: ServerOrderStatus, to: ServerOrderStatus): boolean {
    if (from === to) return false;
    const allowed = VALID_ORDER_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * Throws a 409 INVALID_STATUS_TRANSITION error if transition is not permitted.
   */
  static assertCanTransition(from: ServerOrderStatus, to: ServerOrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid order status transition from '${from}' to '${to}'.`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Checks if an order status is terminal (cannot be modified further).
   */
  static isTerminal(status: ServerOrderStatus): boolean {
    return status === 'completed' || status === 'cancelled';
  }

  /**
   * Validates whether an order can be cancelled at its current status.
   */
  static isCancellable(status: ServerOrderStatus): boolean {
    return this.canTransition(status, 'cancelled');
  }
}
