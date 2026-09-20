import { IProductService, ProductFilterOptions } from '../interfaces';
import { Product, InventoryItem, StorageType } from '@/types';
import { ServerInventoryLot } from '@/server/domain/inventory';

export class ApiProductService implements IProductService {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  private authHeaders(): HeadersInit {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    const params = new URLSearchParams();

    if (filters?.category && filters.category !== 'all') {
      params.set('category', filters.category);
    }
    if (filters?.search && filters.search.trim() !== '') {
      params.set('search', filters.search.trim());
    }
    if (filters?.minPrice !== undefined) {
      params.set('minPrice', filters.minPrice.toString());
    }
    if (filters?.maxPrice !== undefined) {
      params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters?.qualityGrade) {
      params.set('qualityGrade', filters.qualityGrade);
    }
    if (filters?.organicOnly) {
      params.set('organicOnly', 'true');
    }
    if (filters?.sortBy) {
      params.set('sortBy', filters.sortBy);
    }
    if (filters?.sellerId) {
      params.set('sellerId', filters.sellerId);
    }

    const queryStr = params.toString();
    const url = queryStr ? `/api/v1/products?${queryStr}` : '/api/v1/products';

    const res = await fetch(url, {
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to fetch products: ${res.status}`);
    }

    const json = await res.json();
    return (json.data || []) as Product[];
  }

  async getProductById(id: string): Promise<Product | null> {
    const res = await fetch(`/api/v1/products/${id}`, {
      headers: this.authHeaders(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to load product: ${res.status}`);
    }

    const json = await res.json();
    return (json.data?.product || json.data) as Product;
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in to list produce.');
    }

    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(product),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to create product: ${res.status}`);
    }

    const json = await res.json();
    return json.data as Product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in to update listing.');
    }

    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to update product: ${res.status}`);
    }

    const json = await res.json();
    return json.data as Product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required to remove listing.');
    }

    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    return res.status === 204 || res.ok;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const res = await fetch('/api/v1/products?limit=6', {
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const products = (json.data || []) as Product[];
    return products.filter((p) => p.featured || true).slice(0, 6);
  }

  async getInventory(): Promise<InventoryItem[]> {
    const token = this.getAuthToken();
    if (!token) {
      return [];
    }

    const res = await fetch('/api/v1/inventory', {
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to fetch inventory: ${res.status}`);
    }

    const json = await res.json();
    const lots = (json.data || []) as ServerInventoryLot[];

    return lots.map((lot) => {
      let displayStatus: 'In Stock' | 'Low Stock' | 'Reserved' | 'Critical' = 'In Stock';
      if (lot.status === 'critical') displayStatus = 'Critical';
      else if (lot.status === 'low_stock') displayStatus = 'Low Stock';
      else if (lot.status === 'reserved' || lot.status === 'depleted') displayStatus = 'Reserved';

      return {
        id: lot.id,
        productId: lot.productId,
        productName: `Lot #${lot.id.slice(-6).toUpperCase()}`,
        lotNumber: lot.productLotId ? `LOT-${lot.productLotId.slice(-6).toUpperCase()}` : lot.id,
        harvestDate: lot.receivedAt || new Date().toISOString().split('T')[0],
        expiryDate: lot.expiryDate || new Date().toISOString().split('T')[0],
        totalQuantity: lot.quantity,
        availableQuantity: lot.availableQuantity,
        reservedQuantity: lot.reservedQuantity,
        unit: lot.unit,
        qualityGrade: 'Grade A',
        qualityScore: 92,
        storageType: (lot.storageCondition as StorageType) || 'Ambient Warehouse',
        storageFacility: lot.warehouseLocation || 'Farm Gate Silo',
        status: displayStatus,
        minReorderThreshold: 100,
      } as InventoryItem;
    });
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    if (updates.availableQuantity !== undefined || updates.totalQuantity !== undefined) {
      const qty = updates.totalQuantity ?? updates.availableQuantity ?? 0;
      const res = await fetch(`/api/v1/inventory/${id}/adjust`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          adjustmentType: 'correction',
          quantity: qty,
          reason: 'Manual adjustment via inventory manager',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to adjust inventory: ${res.status}`);
      }
    }

    const all = await this.getInventory();
    const updated = all.find((i) => i.id === id);
    if (!updated) {
      throw new Error('Updated inventory item could not be retrieved.');
    }
    return updated;
  }
}

export const apiProductService = new ApiProductService();
