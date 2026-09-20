'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types';
import { notificationService } from '@/services';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    const data = await notificationService.getNotifications();
    setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifs,
  };
}
