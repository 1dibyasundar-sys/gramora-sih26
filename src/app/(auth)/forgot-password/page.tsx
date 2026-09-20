'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Sprout, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';

import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const { resetPassword, isFirebaseConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await resetPassword(email);
        setSubmitted(true);
        success('Password reset link sent to your registered email');
      } else {
        setTimeout(() => {
          setLoading(false);
          setSubmitted(true);
          success('Password reset link sent to your registered email');
        }, 400);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      if (isFirebaseConfigured) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shadow-glow">
              <Sprout className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-h3 font-black text-foreground tracking-tight">Gramora</span>
          </Link>
          <h1 className="text-h4 font-bold text-foreground">Reset Password</h1>
          <p className="text-body-sm text-foreground/60">
            Enter your registered email or phone to receive recovery credentials
          </p>
        </div>

        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5 shadow-card">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-body font-bold text-foreground">Recovery Link Dispatched</h3>
              <p className="text-caption text-foreground/70 leading-relaxed">
                We&apos;ve sent a simulated OTP verification link to <span className="font-mono text-foreground font-semibold">{email}</span>.
              </p>
              <Link href="/login" className="block pt-2">
                <Button variant="primary" size="md" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email or Mobile Number"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh@ananyafarms.in"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full shadow-glow"
              >
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-caption font-semibold text-foreground/60 hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
