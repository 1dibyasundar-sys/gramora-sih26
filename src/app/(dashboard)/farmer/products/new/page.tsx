'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { productService } from '@/services';
import { ProductCategory, QualityGrade, StorageType } from '@/types';
import { useToast } from '@/components/feedback/toast';
import { useAuth } from '@/hooks/useAuth';
import { ImageUploader } from '@/components/ui/image-uploader';
import { ArrowLeft, PlusCircle, Sprout } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('vegetables');
  const [variety, setVariety] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [unit, setUnit] = useState<'kg' | 'quintal' | 'box'>('kg');
  const [marketMandiPrice, setMarketMandiPrice] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('50');
  const [totalAvailableQuantity, setTotalAvailableQuantity] = useState('2000');
  const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shelfLifeDays, setShelfLifeDays] = useState('30');
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('Grade A');
  const [storageType, setStorageType] = useState<StorageType>('Ambient Warehouse');
  const [description, setDescription] = useState('');
  const [organicCertified, setOrganicCertified] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await productService.createProduct({
        title,
        category,
        variety,
        pricePerUnit: Number(pricePerUnit),
        unit,
        marketMandiPrice: Number(marketMandiPrice) || Number(pricePerUnit) * 1.3,
        minOrderQuantity: Number(minOrderQuantity),
        totalAvailableQuantity: Number(totalAvailableQuantity),
        location: {
          district: user?.location?.district || 'Nashik',
          state: user?.location?.state || 'Maharashtra',
          distanceKm: 25,
        },
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
        harvestDate,
        shelfLifeDays: Number(shelfLifeDays),
        qualityGrade,
        storageType,
        description,
        organicCertified,
        tags: ['Fresh Pick', 'Direct Farm Gate'],
      } as any);

      success('New harvest lot listed on direct marketplace!');
      router.push('/farmer/products');
    } catch (err: unknown) {
      console.error(err);
      toastError(err instanceof Error ? err.message : 'Failed to publish listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="List New Harvest Lot">
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'My Crops', href: '/farmer/products' },
            { label: 'List New Harvest' },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Create Harvest Batch Listing</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Enter crop parameters, grade criteria, and direct farm gate pricing
            </p>
          </div>
          <Link href="/farmer/products">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Cancel
            </Button>
          </Link>
        </div>

        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Crop Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cured Premium Nashik Red Onions"
                required
              />
              <Input
                label="Variety / Strain"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Garwa / N-53"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Category"
                options={[
                  { label: 'Vegetables', value: 'vegetables' },
                  { label: 'Fruits', value: 'fruits' },
                  { label: 'Grains & Cereals', value: 'grains' },
                  { label: 'Pulses & Legumes', value: 'pulses' },
                  { label: 'Spices', value: 'spices' },
                  { label: 'Oilseeds', value: 'oilseeds' },
                ]}
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
              />

              <Input
                label="Your Direct Price (₹ / Unit)"
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="28"
                required
              />

              <Select
                label="Unit of Measurement"
                options={[
                  { label: 'Kilogram (kg)', value: 'kg' },
                  { label: 'Quintal (100 kg)', value: 'quintal' },
                  { label: 'Box / Crate', value: 'box' },
                ]}
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'kg' | 'quintal' | 'box')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Local Mandi Benchmark (₹ / Unit)"
                type="number"
                value={marketMandiPrice}
                onChange={(e) => setMarketMandiPrice(e.target.value)}
                placeholder="38"
                helperText="Used to show buyer direct savings percentage"
              />

              <Input
                label="Min Order Quantity (MOQ)"
                type="number"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(e.target.value)}
                placeholder="50"
                required
              />

              <Input
                label="Total Batch Yield (Stock)"
                type="number"
                value={totalAvailableQuantity}
                onChange={(e) => setTotalAvailableQuantity(e.target.value)}
                placeholder="2000"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Quality Grade"
                options={[
                  { label: 'Grade A (Export Quality)', value: 'Grade A (Export)' },
                  { label: 'Grade A (Commercial Prime)', value: 'Grade A' },
                  { label: 'Grade B (Processing Grade)', value: 'Grade B' },
                  { label: 'Organic Certified', value: 'Organic Certified' },
                ]}
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value as QualityGrade)}
              />

              <Select
                label="Storage & Condition"
                options={[
                  { label: 'Ambient Warehouse', value: 'Ambient Warehouse' },
                  { label: 'Cold Storage (Reefer)', value: 'Cold Storage' },
                  { label: 'Farm Gate Dry Shed', value: 'Farm Gate Dry' },
                ]}
                value={storageType}
                onChange={(e) => setStorageType(e.target.value as StorageType)}
              />

              <Input
                label="Harvest Date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Harvest & Agronomic Notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail size grading (e.g. 55mm), skin firmness, moisture percentage, and sorting methodology..."
              rows={3}
            />

            <ImageUploader
              images={images}
              onChange={setImages}
              targetType="product"
              label="Lot & Produce Photography"
              description="Upload real harvest photos to build trust and achieve higher direct buyer bids."
            />

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border">
              <Switch
                checked={organicCertified}
                onChange={setOrganicCertified}
                label="Certified Organic (Jaivik Bharat / NPOP)"
                description="Check if this harvest has valid organic certification documentation"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
              <Link href="/farmer/products">
                <Button variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Publish to Marketplace
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
