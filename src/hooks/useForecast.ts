'use client';

import { useState, useEffect } from 'react';
import { DemandForecast } from '@/types';
import { forecastService } from '@/services';

export function useForecast() {
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    forecastService
      .getForecasts()
      .then((data) => {
        if (active) {
          setForecasts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load forecasts');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { forecasts, loading, error };
}
