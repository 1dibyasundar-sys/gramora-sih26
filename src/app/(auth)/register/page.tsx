'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Alert } from '@/components/feedback/alert';
import {
  Sprout,
  Lock,
  Phone,
  Mail,
  Users,
  ChevronDown,
  Tractor,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/components/feedback/toast';
import { useTranslation } from '@/i18n';
import { LanguageSelector } from '@/components/layout/language-selector';
import {
  normalizeIndianMobile,
  isValidIndianMobile,
  getRoleDashboardPath,
} from '@/lib/auth-helpers';

export default function RegisterPage() {
  const router = useRouter();
  const { switchRole, signUp, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  // Core Signup State — All empty initially
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [landArea, setLandArea] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const mapFirebaseRegisterError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      return t('auth.emailAlreadyInUse');
    }
    if (code === 'auth/invalid-email') {
      return t('auth.invalidEmail');
    }
    if (code === 'auth/weak-password') {
      return t('auth.passwordTooShort');
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Registration is temporarily disabled. Please contact support.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a few moments and try again.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (err?.message && !err.message.includes('Firebase') && !err.message.includes('API key')) {
      return err.message;
    }
    return 'Registration failed. Please verify your details and try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Mobile validation
    const cleanMobile = normalizeIndianMobile(mobile);
    if (!isValidIndianMobile(cleanMobile)) {
      const err = t('auth.invalidMobile');
      setFormError(err);
      showError(err);
      return;
    }

    // 2. Password validation
    if (!password || password.trim().length === 0) {
      const err = t('auth.passwordRequired');
      setFormError(err);
      showError(err);
      return;
    }
    if (password.length < 6) {
      const err = t('auth.passwordTooShort');
      setFormError(err);
      showError(err);
      return;
    }

    // 3. Email validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      const err = t('auth.invalidEmail');
      setFormError(err);
      showError(err);
      return;
    }

    // 4. Role validation
    if (!selectedRole) {
      const err = t('auth.roleRequired');
      setFormError(err);
      showError(err);
      return;
    }

    // 4b. Guard against Admin self-registration
    if (selectedRole === 'admin') {
      const err = t('auth.adminSelfRegisterProhibited');
      setFormError(err);
      showError(err);
      return;
    }

    // 5. Land Area validation (conditional: Farmer only)
    let parsedLandArea: number | undefined;
    if (selectedRole === 'farmer') {
      const num = Number(landArea);
      if (!landArea || isNaN(num) || num <= 0 || !isFinite(num)) {
        const err = t('auth.invalidLandArea');
        setFormError(err);
        showError(err);
        return;
      }
      parsedLandArea = num;
    }

    setLoading(true);

    try {
      const onboardingData: Record<string, unknown> = {
        role: selectedRole,
        phone: `+91 ${cleanMobile}`,
        ...(selectedRole === 'farmer' && parsedLandArea !== undefined
          ? { farmerProfile: { landHoldingAcres: parsedLandArea } }
          : {}),
      };

      if (isFirebaseConfigured) {
        const u = await signUp(trimmedEmail, password, onboardingData);
        success(`Account created successfully as ${t(`auth.${selectedRole}` as any) || selectedRole}!`);
        const targetPath = getRoleDashboardPath(u.role);
        router.push(targetPath);
      } else {
        // Development / Mock Demonstration Mode
        await switchRole(selectedRole as UserRole);
        success(`Account created successfully as ${t(`auth.${selectedRole}` as any) || selectedRole}!`);
        const targetPath = getRoleDashboardPath(selectedRole);
        router.push(targetPath);
      }
    } catch (err: any) {
      const userFriendlyMsg = mapFirebaseRegisterError(err);
      setFormError(userFriendlyMsg);
      showError(userFriendlyMsg);
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
          <h1 className="text-h4 font-bold text-foreground">{t('auth.registerTitle')}</h1>
          <p className="text-body-sm text-foreground/60">{t('auth.registerSubtitle')}</p>
        </div>

        {/* Error Alert */}
        {formError && (
          <Alert variant="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>
        )}

        {/* Compact Signup Card */}
        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Field 1: Mobile Number with +91 Prefix */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="register-mobile" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.mobileNumber')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-2.5 text-body-sm font-semibold text-foreground/70 select-none border-r border-surface-border shrink-0 bg-surface-elevated/40 rounded-l-md">
                  <Phone className="w-3.5 h-3.5 text-primary-400" />
                  <span>+91</span>
                </div>
                <input
                  id="register-mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(val);
                    if (formError) setFormError('');
                  }}
                  placeholder={t('auth.mobilePlaceholder')}
                  required
                  aria-required="true"
                  aria-label={t('auth.mobileNumber')}
                  className="w-full bg-transparent text-foreground placeholder:text-foreground/50 text-body-sm px-3.5 py-2.5 outline-none font-mono tracking-wide"
                />
              </div>
            </div>

            {/* Field 2: Password with Show/Hide Toggle */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="register-password" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.password')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="pl-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError('');
                  }}
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
            </div>

            {/* Field 3: Email Address */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="register-email" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.email')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="pl-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  aria-required="true"
                  aria-label={t('auth.email')}
                  className="w-full bg-transparent text-foreground placeholder:text-foreground/50 text-body-sm pl-3 pr-3.5 py-2.5 outline-none"
                />
              </div>
            </div>

            {/* Field 4: Role Selector Dropdown */}
            <div className="w-full flex flex-col gap-1.5">
              <label htmlFor="register-role" className="text-label text-foreground/80 font-medium select-none">
                {t('auth.role')}
              </label>
              <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                <div className="absolute left-3.5 text-foreground/40 pointer-events-none flex items-center">
                  <Users className="w-4 h-4" />
                </div>
                <select
                  id="register-role"
                  value={selectedRole}
                  onChange={(e) => {
                    const role = e.target.value as UserRole | '';
                    setSelectedRole(role);
                    if (role !== 'farmer') {
                      setLandArea('');
                    }
                    if (formError) setFormError('');
                  }}
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

            {/* Field 5: Farmer Land Area (Conditional — Farmer Only) */}
            {selectedRole === 'farmer' && (
              <div className="w-full flex flex-col gap-1.5 animate-in fade-in duration-150">
                <label
                  htmlFor="register-land-area"
                  className="text-label text-foreground/80 font-medium select-none flex items-center justify-between"
                >
                  <span>{t('auth.landAreaLabel')}</span>
                  <span className="text-[11px] text-primary-400 font-semibold uppercase tracking-wider">
                    {t('auth.farmer')} Required
                  </span>
                </label>
                <div className="relative flex items-center w-full bg-surface-primary/80 border border-surface-border rounded-md transition-all duration-200 focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/80">
                  <div className="pl-3.5 text-foreground/40 pointer-events-none flex items-center">
                    <Tractor className="w-4 h-4" />
                  </div>
                  <input
                    id="register-land-area"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={landArea}
                    onChange={(e) => {
                      setLandArea(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder={t('auth.landAreaPlaceholder')}
                    required
                    aria-required="true"
                    aria-label={t('auth.landAreaLabel')}
                    className="w-full bg-transparent text-foreground placeholder:text-foreground/50 text-body-sm pl-3 pr-16 py-2.5 outline-none font-mono"
                  />
                  <span className="absolute right-3 text-caption font-medium text-foreground/50 pointer-events-none select-none bg-surface-elevated/80 px-2 py-0.5 rounded border border-surface-border">
                    {t('auth.acresUnit')}
                  </span>
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-glow mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('auth.createAccount')}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="pt-4 border-t border-surface-border text-center text-body-sm text-foreground/60">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="text-primary-400 hover:underline font-semibold">
              {t('navigation.signIn')}
            </Link>
          </div>
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
