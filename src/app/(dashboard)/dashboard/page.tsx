'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/app-shell';
import { Spinner } from '@/components/feedback/spinner';

export default function DashboardGateway() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (role === 'farmer' || role === 'fpo') {
        router.replace('/farmer/dashboard');
      } else if (role === 'bulk_buyer' || role === 'consumer') {
        router.replace('/buyer/dashboard');
      } else if (role === 'logistics') {
        router.replace('/logistics/dashboard');
      } else {
        router.replace('/admin/dashboard');
      }
    }
  }, [role, loading, router]);

  return (
    <AppShell title="Loading Dashboard...">
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Spinner size="lg" />
        <p className="text-body-sm text-foreground/60">
          Routing to authorized {role.replace('_', ' ')} workspace...
        </p>
      </div>
    </AppShell>
  );
}
