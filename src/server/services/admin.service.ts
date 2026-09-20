import { userRepository } from '../repositories/user.repository';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { orderItemRepository } from '../repositories/order-item.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { isCloudinaryConfigured } from '../config/env';
import {
  AdminDashboardMetrics,
  AdminUsersQueryInput,
  VerifyUserInput,
  SetUserStatusInput,
  AdminProductsQueryInput,
  ModerateProductInput,
  AdminOrdersQueryInput,
} from '../domain/admin';
import { ServerUserProfile, UserAccountStatus } from '../domain/user';
import { ServerProduct } from '../domain/product';
import { ServerOrder } from '../domain/order';
import { AuthenticatedUser } from '../auth/verify-token';
import { NotFoundError, BadRequestError, AuthorizationError } from '../lib/errors';
import { logger } from '../lib/logger';
import { normalizeRole, ProductListingStatus } from '@/types';

export class AdminService {
  /**
   * Computes authoritative platform metrics aggregated directly from Firestore collections.
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const db = userRepository.db;

    // 1. User aggregations
    const usersSnap = await db.collection('users').get();
    const userDocs = usersSnap.docs.map((d) => d.data() as ServerUserProfile);

    let farmers = 0;
    let fpos = 0;
    let buyers = 0;
    let consumers = 0;
    let logistics = 0;
    let admins = 0;
    let verified = 0;
    let pendingVerification = 0;

    for (const u of userDocs) {
      const canonical = normalizeRole(u.role || 'consumer');
      if (canonical === 'farmer') farmers++;
      else if (canonical === 'fpo') fpos++;
      else if (canonical === 'buyer') buyers++;
      else if (canonical === 'consumer') consumers++;
      else if (canonical === 'logistics') logistics++;
      else if (canonical === 'admin') admins++;

      if (u.verified) {
        verified++;
      } else {
        pendingVerification++;
      }
    }

    // 2. Product aggregations
    const productsSnap = await db.collection('products').get();
    const productDocs = productsSnap.docs.map((d) => d.data() as ServerProduct);

    let activeProducts = 0;
    let draftProducts = 0;
    let archivedProducts = 0;

    for (const p of productDocs) {
      if (p.listingStatus === 'active') activeProducts++;
      else if (p.listingStatus === 'draft') draftProducts++;
      else if (p.listingStatus === 'archived') archivedProducts++;
    }

    // 3. Order aggregations
    const ordersSnap = await db.collection('orders').get();
    const orderDocs = ordersSnap.docs.map((d) => d.data() as ServerOrder);

    let activeOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let totalGmvPaise = 0;

    for (const o of orderDocs) {
      if (o.status === 'completed' || o.status === 'delivered') {
        completedOrders++;
        totalGmvPaise += o.totalMinor || (o.totalAmount ? Math.round(o.totalAmount * 100) : 0);
      } else if (o.status === 'cancelled') {
        cancelledOrders++;
      } else {
        activeOrders++;
      }
    }

    // 4. Inventory aggregations
    const invSnap = await db.collection('inventoryLots').get();
    let totalStockKg = 0;
    for (const d of invSnap.docs) {
      const invData = d.data();
      totalStockKg += Number(invData.availableQuantity || invData.quantity || 0);
    }

    return {
      users: {
        total: userDocs.length,
        farmers,
        fpos,
        buyers,
        consumers,
        logistics,
        admins,
        verified,
        pendingVerification,
      },
      products: {
        total: productDocs.length,
        active: activeProducts,
        draft: draftProducts,
        archived: archivedProducts,
      },
      orders: {
        total: orderDocs.length,
        active: activeOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        totalGmvPaise,
        totalGmvRupees: Math.round(totalGmvPaise / 100),
      },
      inventory: {
        totalLots: invSnap.size,
        totalStockKg,
      },
      systemHealth: {
        database: 'healthy',
        cloudinary: isCloudinaryConfigured() ? 'configured' : 'unconfigured',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Retrieves a filtered, paginated list of platform users.
   */
  async getUsers(query: AdminUsersQueryInput): Promise<{ users: ServerUserProfile[]; total: number }> {
    const { role, status, verified, search, limit = 20, cursor } = query;
    const db = userRepository.db;
    let q = db.collection('users') as FirebaseFirestore.Query;

    if (role && role !== 'all') {
      q = q.where('role', '==', normalizeRole(role));
    }
    if (status) {
      q = q.where('status', '==', status);
    }
    if (verified !== undefined) {
      q = q.where('verified', '==', verified);
    }

    const snap = await q.limit(limit + 10).get();
    let items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerUserProfile));

    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      items = items.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phone?.toLowerCase().includes(term) ||
          u.organization?.toLowerCase().includes(term) ||
          u.kisanId?.toLowerCase().includes(term)
      );
    }

    return {
      users: items.slice(0, limit),
      total: items.length,
    };
  }

  /**
   * Retrieves single user details.
   */
  async getUserById(userId: string): Promise<ServerUserProfile> {
    const user = await userRepository.findByUid(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }

  /**
   * Verifies or unverifies a user profile with audit logging.
   */
  async verifyUser(
    adminUser: AuthenticatedUser,
    targetUid: string,
    input: VerifyUserInput,
    requestId: string
  ): Promise<ServerUserProfile> {
    const target = await this.getUserById(targetUid);

    if (normalizeRole(target.role) === 'admin' && !input.verified) {
      throw new AuthorizationError('Administrator accounts cannot be marked unverified.');
    }

    const updated = await userRepository.update(targetUid, {
      verified: input.verified,
    });

    await auditLogRepository.record({
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'user:verify',
      targetType: 'user',
      targetId: targetUid,
      requestId,
      details: {
        previousVerified: target.verified,
        newVerified: input.verified,
        reason: input.reason,
      },
    });

    logger.info('Admin verified user status', {
      adminUid: adminUser.uid,
      targetUid,
      verified: input.verified,
      requestId,
    });

    return updated;
  }

  /**
   * Updates user account status (active/suspended/deactivated) with audit logging.
   */
  async setUserStatus(
    adminUser: AuthenticatedUser,
    targetUid: string,
    input: SetUserStatusInput,
    requestId: string
  ): Promise<ServerUserProfile> {
    const target = await this.getUserById(targetUid);

    // Prevent suspending or deactivating an administrator account (self or other)
    if (normalizeRole(target.role) === 'admin') {
      throw new AuthorizationError('Administrator accounts cannot be suspended or deactivated.');
    }

    const updated = await userRepository.setStatus(targetUid, input.status as UserAccountStatus);

    await auditLogRepository.record({
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'user:status_change',
      targetType: 'user',
      targetId: targetUid,
      requestId,
      details: {
        previousStatus: target.status,
        newStatus: input.status,
        reason: input.reason,
      },
    });

    logger.info('Admin updated user account status', {
      adminUid: adminUser.uid,
      targetUid,
      status: input.status,
      requestId,
    });

    return updated;
  }

  /**
   * Retrieves products platform-wide across all sellers.
   */
  async getProducts(query: AdminProductsQueryInput): Promise<{ products: ServerProduct[]; total: number }> {
    const { category, status, sellerId, search, limit = 20 } = query;
    const db = productRepository.db;
    let q = db.collection('products') as FirebaseFirestore.Query;

    if (category && category !== 'all') {
      q = q.where('category', '==', category);
    }
    if (status && status !== 'all') {
      q = q.where('listingStatus', '==', status);
    }
    if (sellerId) {
      q = q.where('sellerId', '==', sellerId);
    }

    const snap = await q.limit(limit + 10).get();
    let items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProduct));

    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.variety.toLowerCase().includes(term) ||
          p.sellerName.toLowerCase().includes(term) ||
          p.location?.district.toLowerCase().includes(term)
      );
    }

    return {
      products: items.slice(0, limit),
      total: items.length,
    };
  }

  /**
   * Moderates a product's listing status (active, paused, archived) with audit logging.
   */
  async moderateProduct(
    adminUser: AuthenticatedUser,
    productId: string,
    input: ModerateProductInput,
    requestId: string
  ): Promise<ServerProduct> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    const updated = await productRepository.update(productId, {
      listingStatus: input.listingStatus as ProductListingStatus,
    });

    await auditLogRepository.record({
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'product:moderate',
      targetType: 'product',
      targetId: productId,
      requestId,
      details: {
        sellerId: product.sellerId,
        previousStatus: product.listingStatus,
        newStatus: input.listingStatus,
        reason: input.reason,
      },
    });

    logger.info('Admin moderated product listing', {
      adminUid: adminUser.uid,
      productId,
      status: input.listingStatus,
      requestId,
    });

    return updated;
  }

  /**
   * Retrieves platform-wide orders.
   */
  async getOrders(query: AdminOrdersQueryInput): Promise<{ orders: ServerOrder[]; total: number }> {
    const orders = await orderRepository.findAllOrders(query.status as any, query.limit);
    return {
      orders,
      total: orders.length,
    };
  }

  /**
   * Retrieves single order with its items for administrative inspection.
   */
  async getOrderDetails(orderId: string): Promise<{ order: ServerOrder; items: any[] }> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order', orderId);
    }
    const items = await orderItemRepository.findByOrderId(orderId);
    return { order, items };
  }
}

export const adminService = new AdminService();
