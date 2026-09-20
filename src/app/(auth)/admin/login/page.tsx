'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, switchRole, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('admin@smartagri.sih2026.gov.mock');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        const authUser = await signIn(email, password);
        if (authUser.role !== 'admin') {
          showError('Access denied: You do not possess administrator privileges.');
          return;
        }
        success(`Authenticated as Administrator: ${authUser.name}`);
        router.push('/admin/dashboard');
      } else {
        // Fallback for prototyping prior to Firebase project creation
        await switchRole('admin');
        success('Logged into Administrator Mission Control (Prototyping Session)');
        router.push('/admin/dashboard');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Administrator authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background relative overflow-hidden">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-700 text-white shadow-glow mb-2">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-h3 font-black text-foreground tracking-tight">Mission Control</h1>
            <Badge variant="error" size="sm">Admin Portal</Badge>
          </div>
          <p className="text-body-sm text-foreground/60">
            Government & System Oversight Authentication Gateway
          </p>
        </div>

        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6 shadow-card border-red-500/20">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-caption">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Restricted administrative portal. All authorization checks are strictly verified server-side.</span>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-foreground/80 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary-400" />
                Administrative Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartagri.gov.in"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-foreground/80 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary-400" />
                Master Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500"
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify Administrative Access
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-caption text-foreground/50 hover:text-foreground/80 transition-colors"
            >
              ← Return to Standard Participant Login
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
