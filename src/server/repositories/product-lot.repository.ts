import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerProductLot } from '../domain/product';

export class ProductLotRepository extends BaseFirestoreRepository<ServerProductLot> {
  constructor() {
    super(COLLECTIONS.PRODUCT_LOTS);
  }

  /**
   * Retrieves all harvest lots associated with a specific catalog product.
   */
  async findByProductId(productId: string): Promise<ServerProductLot[]> {
    const snapshot = await this.collection.where('productId', '==', productId).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProductLot)
    );
  }

  /**
   * Retrieves available (purchasable) lots for a product.
   */
  async findActiveLots(productId: string): Promise<ServerProductLot[]> {
    const snapshot = await this.collection
      .where('productId', '==', productId)
      .where('status', '==', 'available')
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProductLot)
    );
  }

  /**
   * Retrieves all lots created by a specific seller.
   */
  async findBySellerId(sellerId: string): Promise<ServerProductLot[]> {
    const snapshot = await this.collection.where('sellerId', '==', sellerId).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerProductLot)
    );
  }
}

export const productLotRepository = new ProductLotRepository();
