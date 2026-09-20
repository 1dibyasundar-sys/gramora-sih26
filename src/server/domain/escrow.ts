import { Identifiable } from '../repositories/base.repository';

export type EscrowTransactionType = 'hold' | 'release' | 'capture' | 'refund';
export type EscrowLedgerStatus = 'pending' | 'locked' | 'released' | 'refunded';

/**
 * Escrow Ledger summary document stored in Firestore 'escrowLedgers/{orderId}'.
 * Financial foundation tracks funds held in disintermediated escrow.
 */
export interface ServerEscrowLedger extends Identifiable {
  id: string; // Document ID is the orderId
  orderId: string;
  buyerId: string;
  sellerIds: string[];
  amountMinor: number;
  currency: 'INR';
  status: EscrowLedgerStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Immutable Escrow Transaction entry stored in Firestore 'escrowTransactions/{transactionId}'.
 * Append-only financial record.
 */
export interface ServerEscrowTransaction extends Identifiable {
  id: string;
  orderId: string;
  type: EscrowTransactionType;
  amountMinor: number;
  currency: 'INR';
  status: 'completed' | 'pending';
  reference: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}
