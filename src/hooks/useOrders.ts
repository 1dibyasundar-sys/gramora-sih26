'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, UserRole } from '@/types';
import { orderService } from '@/services';

export function useOrders(role?: UserRole, userId?: string, initialStatus?: OrderStatus | 'all') {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(initialStatus || 'all');
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrders(role, userId, statusFilter);
      setOrders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [role, userId, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refetch: fetchOrders,
  };
}

export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const o = await orderService.getOrderById(id);
      setOrder(o);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch order';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}

