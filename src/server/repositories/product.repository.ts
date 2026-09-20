import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerProduct, ProductQueryInput } from '../domain/product';
import { Query, DocumentSnapshot } from 'firebase-admin/firestore';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface PaginatedProductsResult {
  products: ServerProduct[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class ProductRepository extends BaseFirestoreRepository<ServerProduct> {
  constructor() {
    super(COLLECTIONS.PRODUCTS);
  }

  /**
   * Retrieves active products listed by a specific seller (farmer or FPO).
   */
  async findBySeller(sellerId: string, includeArchived = false): Promise<ServerProduct[]> {
    let q: Query = this.collection.where('sellerId', '==', sellerId);
    if (!includeArchived) {
      q = q.where('listingStatus', '!=', 'archived');
    }

    const snapshot = await q.get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProduct)
    );
  }

  /**
   * Complex query execution supporting filtering, sorting, and pagination.
   */
  async searchAndFilter(options: ProductQueryInput): Promise<PaginatedProductsResult> {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      qualityGrade,
      organicOnly,
      sortBy = 'newest',
      sellerId,
      status = 'active',
      limit = 20,
      cursor,
    } = options;

    let q: Query = this.collection;

    // Filter by seller if requested
    if (sellerId) {
      q = q.where('sellerId', '==', sellerId);
    }

    // Filter by listing status
    if (status) {
      q = q.where('listingStatus', '==', status);
    }

    // Filter by category
    if (category && category !== 'all') {
      q = q.where('category', '==', category);
    }

    // Filter by organic certification
    if (organicOnly) {
      q = q.where('organicCertified', '==', true);
    }

    // Filter by quality grade
    if (qualityGrade) {
      q = q.where('qualityGrade', '==', qualityGrade);
    }

    // Server-side sorting
    switch (sortBy) {
      case 'price_asc':
        q = q.orderBy('pricePerUnit', 'asc');
        break;
      case 'price_desc':
        q = q.orderBy('pricePerUnit', 'desc');
        break;
      case 'rating':
        q = q.orderBy('sellerRating', 'desc');
        break;
      case 'newest':
      default:
        q = q.orderBy('createdAt', 'desc');
        break;
    }

    // Cursor pagination
    if (cursor) {
      const cursorDoc = await this.collection.doc(cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    // Read limit + 1 to detect hasMore
    q = q.limit(limit + 1);

    let snapshot;
    let usedFallback = false;
    try {
      snapshot = await q.get();
    } catch (err: any) {
      const isMissingIndex = err?.code === 9 || String(err).includes('requires an index');
      if (isMissingIndex) {
        if (process.env.NODE_ENV === 'production') {
          logger.error('Firestore composite index required in production', {
            error: err.message,
            query: { category, status, sortBy, sellerId },
          });
          throw new AppError(
            'Database index required for this query combination. Index deployment pending.',
            500,
            'INDEX_REQUIRED'
          );
        }

        // Development/test/emulator fallback ONLY: strictly bounded to limit + 1
        logger.warn('Missing Firestore index in development; falling back to bounded query', {
          error: err.message,
        });
        usedFallback = true;
        let fallbackQ: Query = this.collection;
        if (sellerId) fallbackQ = fallbackQ.where('sellerId', '==', sellerId);
        if (status) fallbackQ = fallbackQ.where('listingStatus', '==', status);
        if (category && category !== 'all') fallbackQ = fallbackQ.where('category', '==', category);
        fallbackQ = fallbackQ.limit(limit + 1);
        snapshot = await fallbackQ.get();
      } else {
        throw err;
      }
    }

    let docs = snapshot.docs;
    const hasMore = docs.length > limit;
    if (hasMore) {
      docs = docs.slice(0, limit);
    }

    let items: ServerProduct[] = docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProduct)
    );

    // Only apply in-memory sort if development fallback bypassed native Firestore orderBy
    if (usedFallback) {
      switch (sortBy) {
        case 'price_asc':
          items.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
          break;
        case 'price_desc':
          items.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
          break;
        case 'rating':
          items.sort((a, b) => (b.sellerRating || 0) - (a.sellerRating || 0));
          break;
        case 'newest':
        default:
          items.sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          break;
      }
    }

    // Apply price range filtering in memory if not already queried
    if (minPrice !== undefined) {
      items = items.filter((p) => p.pricePerUnit >= minPrice);
    }
    if (maxPrice !== undefined) {
      items = items.filter((p) => p.pricePerUnit <= maxPrice);
    }

    // In-memory search filtering across keywords (title, variety, district, sellerName)
    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.variety.toLowerCase().includes(term) ||
          p.location.district.toLowerCase().includes(term) ||
          p.sellerName.toLowerCase().includes(term)
      );
    }

    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

    return {
      products: items,
      nextCursor,
      hasMore,
    };
  }
}

export const productRepository = new ProductRepository();
