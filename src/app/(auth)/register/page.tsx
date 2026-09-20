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
import { Select } from '@/components/ui/select';
import { Sprout, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';

const ROLE_OPTIONS: { role: UserRole; title: string; description: string }[] = [
  { role: 'farmer', title: 'Individual Farmer', description: 'Sell crops directly from farm gate' },
  { role: 'fpo', title: 'FPO Collective', description: 'Aggregate harvest for 100+ member farmers' },
  { role: 'bulk_buyer', title: 'Bulk Buyer / Horeca', description: 'Wholesale sourcing for retail & processing' },
  { role: 'consumer', title: 'Direct Consumer', description: 'Fresh farm produce delivered home' },
  { role: 'logistics', title: 'Logistics Partner', description: 'Refrigerated & insulated transport fleet' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { switchRole, signUp, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Maharashtra');

  // Dynamic Role Fields
  const [landAcres, setLandAcres] = useState('8.5');
  const [kisanId, setKisanId] = useState('');
  const [fpoRegNo, setFpoRegNo] = useState('');
  const [fpoFarmerCount, setFpoFarmerCount] = useState('350');
  const [gstin, setGstin] = useState('');
  const [fleetSize, setFleetSize] = useState('12');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const onboardingData: Record<string, unknown> = {
          role: selectedRole,
          name: name || 'New Member',
          phone: phone || '+91 98000 00000',
          location: {
            villageOrCity: district || 'Local Hub',
            district: district || 'Nashik',
            state: state || 'Maharashtra',
            pincode: '422001',
          },
          ...(selectedRole === 'farmer' ? { farmerProfile: { kisanId: kisanId || 'KISAN-DEMO-01', landHoldingAcres: Number(landAcres) || 5 } } : {}),
          ...(selectedRole === 'fpo' ? { fpoProfile: { fpoRegNumber: fpoRegNo || 'FPO-REG-DEMO', memberFarmersCount: Number(fpoFarmerCount) || 100 } } : {}),
          ...(selectedRole === 'bulk_buyer' ? { buyerProfile: { gstin: gstin || '27AABCG1234F1Z8', businessType: 'supermarket' } } : {}),
          ...(selectedRole === 'logistics' ? { logisticsProfile: { fleetSize: Number(fleetSize) || 10, primaryVehicleType: 'Refrigerated 10T Truck' } } : {}),
        };

        const u = await signUp(email, 'TemporaryPassword123!', onboardingData);
        success(`Account created successfully as ${selectedRole.replace('_', ' ').toUpperCase()}!`);
        if (u.role === 'farmer' || u.role === 'fpo') router.push('/farmer/dashboard');
        else if (u.role === 'buyer' || (u.role as string) === 'bulk_buyer' || u.role === 'consumer') router.push('/buyer/dashboard');
        else if (u.role === 'logistics') router.push('/logistics/dashboard');
        else router.push('/dashboard');
      } else {
        setTimeout(async () => {
          await switchRole(selectedRole);
          setLoading(false);
          success(`Account created successfully as ${selectedRole.replace('_', ' ').toUpperCase()}!`);
          if (selectedRole === 'farmer' || selectedRole === 'fpo') router.push('/farmer/dashboard');
          else if (selectedRole === 'bulk_buyer' || selectedRole === 'consumer') router.push('/buyer/dashboard');
          else if (selectedRole === 'logistics') router.push('/logistics/dashboard');
          else router.push('/dashboard');
        }, 500);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      if (isFirebaseConfigured) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col justify-center items-center bg-background relative overflow-hidden">
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shadow-glow">
              <Sprout className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-h3 font-black text-foreground tracking-tight">Gramora</span>
          </Link>
          <h1 className="text-h3 font-bold text-foreground">Join the Agricultural Network</h1>
          <p className="text-body-sm text-foreground/60">
            Select your platform role to configure tailored features and compliance
          </p>
        </div>

        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6 shadow-card">
          {/* Role Selector Grid */}
          <div className="space-y-3">
            <label className="text-label text-foreground/80 font-bold uppercase text-xs tracking-wider">
              1. Select Your Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = selectedRole === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setSelectedRole(opt.role)}
                    className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-primary-600/20 border-primary-500 text-foreground ring-1 ring-primary-500/50'
                        : 'bg-surface-primary/80 border-surface-border text-foreground/70 hover:border-surface-border/80 hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-body-sm text-foreground">{opt.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0" />}
                    </div>
                    <span className="text-caption text-foreground/50 mt-1">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-surface-border">
            <label className="text-label text-foreground/80 font-bold uppercase text-xs tracking-wider block">
              2. Basic Account Details
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Representative"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98230 12345"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@ananyafarms.in"
                required
              />
              <Input
                label="District & State"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Nashik, Maharashtra"
                required
              />
            </div>

            {/* DYNAMIC ROLE FIELDS */}
            <div className="pt-2 border-t border-surface-border space-y-3">
              <label className="text-label text-foreground/80 font-bold uppercase text-xs tracking-wider block">
                3. {ROLE_OPTIONS.find((r) => r.role === selectedRole)?.title} Specific Information
              </label>

              {selectedRole === 'farmer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <Input
                    label="Land Holding (Acres)"
                    type="number"
                    value={landAcres}
                    onChange={(e) => setLandAcres(e.target.value)}
                    placeholder="e.g. 5.5"
                  />
                  <Input
                    label="PM-Kisan ID / Kisan Credit Card No."
                    value={kisanId}
                    onChange={(e) => setKisanId(e.target.value)}
                    placeholder="e.g. MH-NSK-2024-8849"
                  />
                </div>
              )}

              {selectedRole === 'fpo' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <Input
                    label="FPO Registration / MCA Number"
                    value={fpoRegNo}
                    onChange={(e) => setFpoRegNo(e.target.value)}
                    placeholder="FPO-OD-KLH-0941"
                    required
                  />
                  <Input
                    label="Number of Member Farmers"
                    type="number"
                    value={fpoFarmerCount}
                    onChange={(e) => setFpoFarmerCount(e.target.value)}
                    placeholder="e.g. 420"
                  />
                </div>
              )}

              {selectedRole === 'bulk_buyer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <Input
                    label="GSTIN Number"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AABCG1234F1Z8"
                    required
                  />
                  <Select
                    label="Commercial Buyer Type"
                    options={[
                      { label: 'Supermarket / Retail Chain', value: 'supermarket' },
                      { label: 'Food Processing Industry', value: 'processing' },
                      { label: 'Horeca (Hotel/Restaurant/Caterer)', value: 'horeca' },
                      { label: 'Export House', value: 'exporter' },
                    ]}
                  />
                </div>
              )}

              {selectedRole === 'logistics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <Input
                    label="Total Fleet Size (Vehicles)"
                    type="number"
                    value={fleetSize}
                    onChange={(e) => setFleetSize(e.target.value)}
                    placeholder="e.g. 15"
                  />
                  <Select
                    label="Primary Fleet Capability"
                    options={[
                      { label: 'Refrigerated Cold-Chain Reefer', value: 'reefer' },
                      { label: 'Insulated Fast Dry Cargo', value: 'insulated' },
                      { label: 'Electric Last-Mile Urban Mini-Trucks', value: 'ev' },
                    ]}
                  />
                </div>
              )}

              {selectedRole === 'consumer' && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-150">
                  <Input
                    label="Delivery Apartment / Street Address"
                    placeholder="Flat 402, Green Meadows, Indiranagar"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-glow mt-4"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration & Access Dashboard
            </Button>
          </form>

          <div className="pt-2 border-t border-surface-border text-center text-body-sm text-foreground/60">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </GlassCard>

        <div className="text-center text-caption text-foreground/40 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
          <span>Strict Zero-Backend Mock Architecture • Fully typed for future API integration</span>
        </div>
      </div>
    </div>
  );
}
