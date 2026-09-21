import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/feedback/toast';
import { LanguageProvider } from '@/i18n';

export const metadata: Metadata = {
  title: 'Gramora | Direct Agricultural Marketplace & Smart Logistics (SIH 2026)',
  description:
    'Smart India Hackathon 2026 (Problem Statement 26033) — Direct farm-to-consumer and bulk commerce platform eliminating intermediaries, maximizing farmer revenue, and providing transparent cold-chain logistics.',
  keywords: [
    'Smart India Hackathon 2026',
    'Agriculture Marketplace',
    'FPO Collective',
    'Direct Farmer Selling',
    'Cold Chain Logistics',
    'Demand Forecasting',
    'Route Optimization',
  ],
  authors: [{ name: 'Gramora Product Architecture Team' }],
  openGraph: {
    title: 'Gramora | Direct Agricultural Marketplace (SIH 2026)',
    description:
      'Connecting farmers and FPOs directly with consumers, bulk buyers, and cold-chain logistics to maximize grower income and freshness.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#080d0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-primary-500/30 selection:text-primary-200">
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
