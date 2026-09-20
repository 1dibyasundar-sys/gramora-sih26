import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerAuditLog } from '../domain/admin';

const SENSITIVE_DETAIL_KEYS = [
  'token',
  'secret',
  'password',
  'privatekey',
  'private_key',
  'apikey',
  'api_key',
  'credential',
  'authorization',
];

function sanitizeAuditDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(details)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_DETAIL_KEYS.some((k) => lower.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeAuditDetails(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export class AuditLogRepository extends BaseFirestoreRepository<ServerAuditLog> {
  constructor() {
    super(COLLECTIONS.AUDIT_LOGS);
  }

  /**
   * Records an immutable audit log entry.
   * Defensively strips sensitive credentials before persisting.
   */
  async record(entry: Omit<ServerAuditLog, 'id' | 'timestamp'>): Promise<ServerAuditLog> {
    const now = new Date().toISOString();
    const docRef = this.collection.doc();

    const record: ServerAuditLog = {
      ...entry,
      details: sanitizeAuditDetails(entry.details),
      id: docRef.id,
      timestamp: now,
    };

    await docRef.set(record);
    return record;
  }

  /**
   * Retrieves recent audit log entries for an administrative target or actor.
   */
  async findByTarget(targetId: string, limit: number = 20): Promise<ServerAuditLog[]> {
    const snap = await this.collection
      .where('targetId', '==', targetId)
      .limit(limit)
      .get();

    return snap.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerAuditLog)
    );
  }
}

export const auditLogRepository = new AuditLogRepository();
