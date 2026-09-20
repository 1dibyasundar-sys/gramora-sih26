'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { productService } from '@/services';
import { useProduct } from '@/hooks/useProducts';
import { useToast } from '@/components/feedback/toast';
import { ImageUploader } from '@/components/ui/image-uploader';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = (params.id as string) || 'prod-01';
  const { product, loading: fetching } = useProduct(productId);
  const { success, error } = useToast();

  const [title, setTitle] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [marketMandiPrice, setMarketMandiPrice] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [totalAvailableQuantity, setTotalAvailableQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPricePerUnit(product.pricePerUnit.toString());
      setMarketMandiPrice(product.marketMandiPrice?.toString() || '');
      setMinOrderQuantity(product.minOrderQuantity.toString());
      setTotalAvailableQuantity(product.totalAvailableQuantity.toString());
      setDescription(product.description);
      setImages(product.images || []);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await productService.updateProduct(productId, {
        title,
        pricePerUnit: Number(pricePerUnit),
        marketMandiPrice: Number(marketMandiPrice),
        minOrderQuantity: Number(minOrderQuantity),
        totalAvailableQuantity: Number(totalAvailableQuantity),
        description,
        images,
      });

      success('Crop listing details updated successfully!');
      router.push('/farmer/products');
    } catch (err: any) {
      error(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AppShell title="Edit Crop Listing">
        <div className="max-w-3xl mx-auto p-12 text-center text-foreground/60">
          Loading listing details...
        </div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="Edit Crop Listing">
        <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
          <p className="text-foreground/60">Listing not found or access denied.</p>
          <Link href="/farmer/products">
            <Button variant="primary" size="sm">
              Back to My Crops
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Crop Listing">
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'My Crops', href: '/farmer/products' },
            { label: 'Edit Listing' },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Edit Listing: {title || productId}</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Update direct pricing and batch available stock
            </p>
          </div>
          <Link href="/farmer/products">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
        </div>

        <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Listing Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Direct Farm Gate Price (₹)"
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
              />
              <Input
                label="Mandi Benchmark Comparison (₹)"
                type="number"
                value={marketMandiPrice}
                onChange={(e) => setMarketMandiPrice(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Available Batch Stock"
                type="number"
                value={totalAvailableQuantity}
                onChange={(e) => setTotalAvailableQuantity(e.target.value)}
                required
              />
              <Input
                label="Min Order Quantity"
                type="number"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Harvest Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <ImageUploader
              images={images}
              onChange={setImages}
              targetType="product"
              productId={productId}
              label="Crop & Lot Photos"
              description="Update or replace photographs of this produce lot."
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
              <Link href="/farmer/products">
                <Button variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
