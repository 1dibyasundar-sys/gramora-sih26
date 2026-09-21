'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Alert } from '@/components/feedback/alert';
import { Sprout, Lock, Phone, ArrowRight, Eye, EyeOff, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';
import { useTranslation } from '@/i18n';
import { LanguageSelector } from '@/components/layout/language-selector';
import {
  normalizeIndianMobile,
  isValidIndianMobile,
  resolveMobileToEmail,
  rolesMatch,
  getRoleDashboardPath,
  DEMO_ACCOUNTS,
} from '@/lib/auth-helpers';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signOut, switchRole, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Mobile number validation (Phase 3)
    const cleanMobile = normalizeIndianMobile(mobile);
    if (!isValidIndianMobile(cleanMobile)) {
      const err = t('auth.invalidMobile');
      setFormError(err);
      showError(err);
      return;
    }

    // 2. Password presence check
    if (!password || password.trim().length === 0) {
      const err = t('auth.passwordRequired');
      setFormError(err);
      showError(err);
      return;
    }

    // 3. Role selection check
    if (!selectedRole) {
      const err = t('auth.roleRequired');
      setFormError(err);
      showError(err);
      return;
    }

    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        // Resolve mobile to authoritative email identifier for Firebase Auth
        const emailIdentifier = resolveMobileToEmail(cleanMobile);
        const authenticatedUser = await signIn(emailIdentifier, password);

        // Authoritative Server-Side Role Enforcement (Phase 6)
        if (!rolesMatch(selectedRole, authenticatedUser.role)) {
          // Immediately reject session and clear client state
          await signOut();

          const canonicalActual = authenticatedUser.role === 'bulk_buyer' ? 'buyer' : authenticatedUser.role;
          const actualRoleLabel = t(`auth.${canonicalActual}` as any) || authenticatedUser.role;
          const mismatchMsg = t('auth.roleMismatch', { role: actualRoleLabel });
          setFormError(mismatchMsg);
          showError(mismatchMsg);
          return;
        }

        // Account status check
        if ((authenticatedUser as any).status === 'suspended' || (authenticatedUser as any).status === 'deactivated') {
          await signOut();
          const disabledMsg = t('auth.accountDisabled');
          setFormError(disabledMsg);
          showError(disabledMsg);
          return;
        }

        // Success transition (Phase 7)
        success(`Welcome, ${authenticatedUser.name}!`);
        const targetPath = getRoleDashboardPath(authenticatedUser.role);
        router.push(targetPath);
      } else {
        // Development / Mock Demonstration Mode
        const matchedDemo = Object.values(DEMO_ACCOUNTS).find((acc) => acc.mobile === cleanMobile);

        if (matchedDemo && !rolesMatch(selectedRole, matchedDemo.role)) {
          const canonicalActual = matchedDemo.role === 'bulk_buyer' ? 'buyer' : matchedDemo.role;
          const actualRoleLabel = t(`auth.${canonicalActual}` as any) || matchedDemo.label;
          const mismatchMsg = t('auth.roleMismatch', { role: actualRoleLabel });
          setFormError(mismatchMsg);
          showError(mismatchMsg);
          return;
        }

        await switchRole(selectedRole as UserRole);
        success(`Signed in as ${t(`auth.${selectedRole}` as any) || selectedRole}`);
        const targetPath = getRoleDashboardPath(selectedRole);
        router.push(targetPath);
      }
    } catch (err: any) {
      let message = t('auth.authFailed');
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        message = t('auth.authFailed');
      } else if (err?.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again in a few moments.';
      } else if (err?.message && !err.message.includes('Firebase') && !err.message.includes('API key')) {
        message = err.message;
      }
      setFormError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background relative overflow-hidden">
      {/* Top Language Bar */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

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
          <h1 className="text-h4 font-bold text-foreground">{t('auth.signInTitle')}</h1>
          <p className="text-body-sm text-foreground/60">{t('auth.signInSubtitle')}</p>
        </div>

        {/* Error Alert */}
        {formError && (
          <Alert variant="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>
        )}

        {/* Simplified Login Form Card */}
        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5 shadow-card">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Field 1: Mobile Number with +91 Prefix (Phase 2 & Phase 3) */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="login-mobile" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.mobileNumber')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-2.5 text-body-sm font-semibold text-foreground/70 select-none border-r border-surface-border shrink-0 bg-surface-elevated/40 rounded-l-md">
                  <Phone className="w-3.5 h-3.5 text-primary-400" />
                  <span>+91</span>
                </div>
                <input
                  id="login-mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(val);
                  }}
                  placeholder={t('auth.mobilePlaceholder')}
                  required
                  aria-required="true"
                  aria-label={t('auth.mobileNumber')}
                  className="w-full bg-transparent text-foreground placeholder:text-foreground/50 text-body-sm px-3.5 py-2.5 outline-none font-mono tracking-wide"
                />
              </div>
            </div>

            {/* Field 2: Password with Show/Hide Toggle (Phase 2 & Phase 12) */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.password')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="pl-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  aria-required="true"
                  aria-label={t('auth.password')}
                  className="w-full bg-transparent text-foreground placeholder:text-foreground/50 text-body-sm pl-3 pr-10 py-2.5 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-3 text-foreground/40 hover:text-foreground/80 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-caption text-primary-400 hover:text-primary-300 font-medium transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            {/* Field 3: Role Selector Dropdown (Phase 2 & Phase 6) */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="login-role" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.role')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="absolute left-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <Users className="w-4 h-4" />
                </div>
                <select
                  id="login-role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
                  required
                  aria-required="true"
                  aria-label={t('auth.role')}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full appearance-none bg-transparent text-body-sm pl-10 pr-10 py-2.5 outline-none cursor-pointer transition-colors ${
                    !selectedRole ? 'text-foreground/50' : 'text-foreground font-medium'
                  }`}
                >
                  <option value="" disabled className="bg-[#0e1713] text-foreground/50">
                    {t('auth.selectRole')}
                  </option>
                  <option value="farmer" className="bg-[#0e1713] text-foreground">
                    {t('auth.farmer')}
                  </option>
                  <option value="fpo" className="bg-[#0e1713] text-foreground">
                    {t('auth.fpo')}
                  </option>
                  <option value="buyer" className="bg-[#0e1713] text-foreground">
                    {t('auth.buyer')}
                  </option>
                  <option value="consumer" className="bg-[#0e1713] text-foreground">
                    {t('auth.consumer')}
                  </option>
                  <option value="logistics" className="bg-[#0e1713] text-foreground">
                    {t('auth.logisticsPartner')}
                  </option>
                  <option value="admin" className="bg-[#0e1713] text-foreground">
                    {t('auth.admin')}
                  </option>
                </select>
                <div className="absolute right-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Primary CTA (Phase 2) */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-glow mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('navigation.signIn')}
            </Button>
          </form>

          {/* Registration Link */}
          <div className="pt-4 border-t border-surface-border text-center text-body-sm text-foreground/60">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-primary-400 hover:underline font-semibold">
              {t('navigation.getStarted')}
            </Link>
          </div>

          {/* Collapsible Demo Accounts Reference (Phase 5) */}
          <details className="pt-2 border-t border-surface-border/60 group">
            <summary className="cursor-pointer text-caption text-foreground/50 hover:text-foreground/80 font-medium select-none text-center list-none flex items-center justify-center gap-1.5">
              <span>{t('auth.demoCredentials')} (SIH 2026)</span>
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 p-3 rounded-xl bg-surface-elevated/60 border border-surface-border space-y-1.5 text-caption font-mono">
              <div className="text-[11px] text-foreground/60 font-sans mb-1 font-semibold">
                Click any demo profile to prefill:
              </div>
              {Object.entries(DEMO_ACCOUNTS).map(([key, acc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMobile(acc.mobile);
                    setPassword(acc.placeholderPassword);
                    setSelectedRole(acc.role);
                    setFormError('');
                  }}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-secondary/70 transition-colors text-left"
                >
                  <span className="font-semibold text-foreground/80 font-sans">{acc.label}</span>
                  <span className="text-primary-400">{acc.mobile}</span>
                </button>
              ))}
            </div>
          </details>
        </GlassCard>

        {/* Security Badge */}
        <div className="text-center text-caption text-foreground/40 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
          <span>Server-Authoritative RBAC • Firebase Authentication Protected</span>
        </div>
      </div>
    </div>
  );
}
