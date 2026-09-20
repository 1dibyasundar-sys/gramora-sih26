'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Sprout, Lock, Mail, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';

export default function LoginPage() {
  const router = useRouter();
  const { switchRole, signIn, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('ramesh.patel@ananyafarms.mock');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const u = await signIn(email, password);
        success(`Welcome back, ${u.name}!`);
        if (u.role === 'farmer' || u.role === 'fpo') router.push('/farmer/dashboard');
        else if (u.role === 'buyer' || (u.role as string) === 'bulk_buyer' || u.role === 'consumer') router.push('/buyer/dashboard');
        else if (u.role === 'logistics') router.push('/logistics/dashboard');
        else if (u.role === 'admin') router.push('/admin/dashboard');
        else router.push('/dashboard');
      } else {
        setTimeout(() => {
          setLoading(false);
          success('Logged in successfully to Gramora demo session');
          router.push('/dashboard');
        }, 400);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      if (isFirebaseConfigured) {
        setLoading(false);
      }
    }
  };

  const handleQuickDemoLogin = async (selectedRole: UserRole) => {
    setLoading(true);
    await switchRole(selectedRole);
    setLoading(false);
    success(`Logged in as ${selectedRole.replace('_', ' ').toUpperCase()}`);
    if (selectedRole === 'farmer' || selectedRole === 'fpo') router.push('/farmer/dashboard');
    else if (selectedRole === 'bulk_buyer' || selectedRole === 'consumer') router.push('/buyer/dashboard');
    else if (selectedRole === 'logistics') router.push('/logistics/dashboard');
    else router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background relative overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shadow-glow">
              <Sprout className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-h3 font-black text-foreground tracking-tight">Gramora</span>
          </Link>
          <h1 className="text-h4 font-bold text-foreground">Sign In to Your Account</h1>
          <p className="text-body-sm text-foreground/60">
            Access your agricultural marketplace and logistics operations
          </p>
        </div>

        {/* 1-Click Quick Demo Switcher Card */}
        <div className="rounded-2xl p-4 bg-surface-primary/90 border border-primary-500/30 glass-panel space-y-2.5">
          <div className="flex items-center gap-1.5 text-caption font-bold text-primary-300">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            <span>Instant Demo Sign-In (For SIH Evaluators):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('farmer')}
            >
              Farmer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('fpo')}
            >
              FPO Collective
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('bulk_buyer')}
            >
              Bulk Buyer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('consumer')}
            >
              Consumer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('logistics')}
            >
              Logistics
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleQuickDemoLogin('admin')}
            >
              Mission Admin
            </Button>
          </div>
        </div>

        {/* Form Card */}
        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5 shadow-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email address or Phone number"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="e.g. farmer@domain.com or 9823012345"
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Enter password"
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-caption text-primary-400 hover:text-primary-300 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-glow mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="pt-4 border-t border-surface-border text-center text-body-sm text-foreground/60">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary-400 hover:underline font-semibold">
              Register now
            </Link>
          </div>
        </GlassCard>

        <div className="text-center text-caption text-foreground/40 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
          <span>Simulated Authentication Layer • Ready for Firebase / Supabase API</span>
        </div>
      </div>
    </div>
  );
}
