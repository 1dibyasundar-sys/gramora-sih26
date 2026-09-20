'use client';

import { useState, useEffect } from 'react';
import { Route } from '@/types';
import { routeService } from '@/services';

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    routeService
      .getRoutes()
      .then((data) => {
        if (active) {
          setRoutes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load routes');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { routes, loading, error };
}

export function useRoute(id: string) {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    routeService
      .getRouteById(id)
      .then((r) => {
        if (active) {
          setRoute(r);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load route');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const updateStop = async (stopId: string, status: 'pending' | 'arrived' | 'completed' | 'skipped') => {
    if (!route) return;
    const updated = await routeService.updateStopStatus(route.id, stopId, status);
    setRoute({ ...updated });
  };

  return { route, loading, error, updateStop };
}
