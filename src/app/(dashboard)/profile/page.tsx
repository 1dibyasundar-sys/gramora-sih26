'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Switch } from '@/components/ui/switch';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/feedback/toast';
import { useTranslation } from '@/i18n';
import { SupportedLanguage } from '@/i18n/types';
import {
  Save,
  CheckCircle2,
  Globe,
  Check,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, role, updateUser } = useAuth();
  const { success } = useToast();
  const { t, language, setLanguage, supportedLanguages } = useTranslation();

  const [name, setName] = useState(user?.name || 'Ramesh Patel');
  const [email, setEmail] = useState(user?.email || 'ramesh.patel@ananyafarms.mock');
  const [phone, setPhone] = useState(user?.phone || '+91 98230 45678');
  const [organization, setOrganization] = useState(user?.organization || 'Ananya Farms');
  const [village, setVillage] = useState(user?.location.villageOrCity || 'Dindori');
  const [district, setDistrict] = useState(user?.location.district || 'Nashik');
  const [state, setState] = useState(user?.location.state || 'Maharashtra');
  const [pincode, setPincode] = useState(user?.location.pincode || '422202');

  // Preferences toggles
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [thermalAlerts, setThermalAlerts] = useState(true);
  const [priceSurgeAlerts, setPriceSurgeAlerts] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateUser({
      name,
      email,
      phone,
      organization,
      location: { villageOrCity: village, district, state, pincode },
    });
    setLoading(false);
    success(t('common.success') + ': ' + t('profile.savePreferences'));
  };

  const handleLanguageChange = (code: SupportedLanguage) => {
    setLanguage(code);
    success(t('profile.languageTitle') + ': ' + code.toUpperCase());
  };

  return (
    <AppShell title={t('profile.title')}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Profile Identity Card */}
        <div className="rounded-2xl p-6 glass-panel border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar
              src={user?.avatarUrl}
              fallback={name}
              size="lg"
              status="online"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h4 font-bold text-foreground">{name}</h2>
                <Badge variant="primary" size="sm">
                  {role.toUpperCase().replace('_', ' ')}
                </Badge>
                {user?.verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> {t('common.verified')}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-foreground/60 mt-0.5">{organization}</p>
              <p className="text-caption text-foreground/50 mt-1">
                Joined: {user?.joinedDate || '2025-04-12'} • Member ID: {user?.id}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-caption text-foreground/50 block">Registered Mandi ID:</span>
            <span className="font-mono font-bold text-primary-400 text-body-sm">
              {user?.kisanId || user?.fpoRegNumber || user?.gstin || 'MH-REG-2026-9901'}
            </span>
          </div>
        </div>

        {/* Language Preferences Card */}
        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 border-b border-surface-border pb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-body font-bold text-foreground">
                {t('profile.languageTitle')} ({t('profile.languagePreferences')})
              </h3>
              <p className="text-caption text-foreground/60">
                {t('profile.languageDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary-500/15 border-primary-500/50 shadow-glow'
                      : 'bg-surface-elevated/40 border-surface-border/60 hover:bg-surface-elevated/80 hover:border-surface-border'
                  }`}
                >
                  <div>
                    <div className="font-bold text-foreground text-body-sm">
                      {lang.nativeName}
                    </div>
                    <div className="text-caption text-foreground/50">
                      {lang.englishName} ({lang.code})
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-surface-border/50" />
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
            <h3 className="text-body font-bold text-foreground border-b border-surface-border pb-3">
              {t('profile.personalInfo')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('auth.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label={t('auth.organization')}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label={t('auth.phone')}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-surface-border">
              <Input
                label={t('profile.village')}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                required
              />
              <Input
                label={t('profile.district')}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
              <Input
                label={t('profile.state')}
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
              <Input
                label={t('profile.pincode')}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
              />
            </div>
          </GlassCard>

          {/* Operational & Telemetry Notifications */}
          <GlassCard variant="strong" className="p-6 sm:p-8 space-y-4">
            <h3 className="text-body font-bold text-foreground border-b border-surface-border pb-3">
              {t('profile.notificationPreferences')}
            </h3>

            <div className="space-y-4">
              <Switch
                checked={smsAlerts}
                onChange={setSmsAlerts}
                label={t('profile.smsAlerts')}
                description={t('profile.smsAlertsDesc')}
              />
              <Switch
                checked={thermalAlerts}
                onChange={setThermalAlerts}
                label={t('profile.thermalAlerts')}
                description={t('profile.thermalAlertsDesc')}
              />
              <Switch
                checked={priceSurgeAlerts}
                onChange={setPriceSurgeAlerts}
                label={t('profile.priceSurgeAlerts')}
                description={t('profile.priceSurgeAlertsDesc')}
              />
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {t('profile.savePreferences')}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
