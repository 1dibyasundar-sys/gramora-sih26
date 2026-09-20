'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, ProductFilterOptions, InventoryItem } from '@/types';
import { productService } from '@/services';

export function useProducts(initialFilters?: ProductFilterOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilterOptions>(initialFilters || {});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProducts(filters);
      setProducts(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load products';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchProducts,
  };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService
      .getProductById(id)
      .then((p) => {
        if (active) {
          setProduct(p);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error fetching product';
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { product, loading, error };
}

export function useFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    productService
      .getFeaturedProducts()
      .then((data) => {
        if (active) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load featured products';
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { products, loading, error };
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await productService.getInventory();
      setInventory(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { inventory, loading, error, refetch: fetchInventory };
}

export function useFarmerProducts(sellerId?: string) {
  const [farmerFilters, setFarmerFilters] = useState<ProductFilterOptions>({
    sellerId,
  });

  useEffect(() => {
    if (sellerId) {
      setFarmerFilters({ sellerId });
    }
  }, [sellerId]);

  return useProducts(farmerFilters);
}
