'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ProductCategory, ProductFilterOptions, QualityGrade } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Filter, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface FilterPanelProps {
  filters: ProductFilterOptions;
  onChange: (newFilters: ProductFilterOptions) => void;
  onReset: () => void;
  className?: string;
}

export function FilterPanel({ filters, onChange, onReset, className }: FilterPanelProps) {
  const { t } = useTranslation();

  const categories: { label: string; value: ProductCategory | 'all' }[] = [
    { label: t('marketplace.allCategories'), value: 'all' },
    { label: t('marketplace.vegetables'), value: 'vegetables' },
    { label: t('marketplace.fruits'), value: 'fruits' },
    { label: t('marketplace.grains'), value: 'grains' },
    { label: t('marketplace.pulses'), value: 'pulses' },
    { label: t('marketplace.spices'), value: 'spices' },
    { label: t('marketplace.oilseeds'), value: 'oilseeds' },
  ];

  const grades: { label: string; value: QualityGrade | '' }[] = [
    { label: t('common.all'), value: '' },
    { label: t('marketplace.gradeAExport'), value: 'Grade A (Export)' },
    { label: t('marketplace.gradeA'), value: 'Grade A' },
    { label: t('marketplace.gradeB'), value: 'Grade B' },
    { label: t('marketplace.organicCertified'), value: 'Organic Certified' },
  ];

  return (
    <div
      className={cn(
        'rounded-2xl border border-surface-border bg-surface-primary/95 p-5 glass-panel flex flex-col gap-6',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-400" />
          <h3 className="text-body font-bold text-foreground">{t('common.filter')}</h3>
        </div>
        <button
          onClick={onReset}
          className="text-caption font-semibold text-foreground/50 hover:text-primary-400 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {t('common.clearFilters')}
        </button>
      </div>

      {/* Category selector */}
      <div className="space-y-2">
        <label className="text-label text-foreground/70 uppercase text-[11px] font-bold tracking-wider">
          {t('marketplace.allCategories')}
        </label>
        <div className="flex flex-col gap-1">
          {categories.map((cat) => {
            const isSelected = (filters.category || 'all') === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() =>
                  onChange({
                    ...filters,
                    category: cat.value === 'all' ? undefined : cat.value,
                  })
                }
                className={cn(
                  'text-left text-body-sm px-3 py-2 rounded-lg transition-colors font-medium flex items-center justify-between',
                  isSelected
                    ? 'bg-primary-600/20 text-primary-300 font-semibold border border-primary-500/30'
                    : 'text-foreground/70 hover:text-foreground hover:bg-surface-elevated'
                )}
              >
                <span>{cat.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2.5">
        <label className="text-label text-foreground/70 uppercase text-[11px] font-bold tracking-wider">
          {t('marketplace.priceRange')}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="10"
            max="10000"
            step="50"
            value={filters.maxPrice || 10000}
            onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            aria-label={t('marketplace.priceRange')}
            className="w-full accent-primary-500 cursor-pointer h-2 bg-surface-elevated rounded-lg appearance-none border border-surface-border/60"
          />
          <span className="text-body-sm font-bold text-primary-400 min-w-[70px] text-right font-mono">
            ₹{(filters.maxPrice || 10000).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Quality Grade */}
      <div className="space-y-2">
        <Select
          label={t('marketplace.qualityGrade')}
          options={grades}
          value={filters.qualityGrade || ''}
          onChange={(e) => onChange({ ...filters, qualityGrade: (e.target.value as QualityGrade) || undefined })}
        />
      </div>

      {/* Organic Switch */}
      <div className="pt-2 border-t border-surface-border">
        <Switch
          checked={!!filters.organicOnly}
          onChange={(checked) => onChange({ ...filters, organicOnly: checked })}
          label={t('marketplace.organicCertified')}
          description="Verified NPOP / Jaivik Bharat"
        />
      </div>
    </div>
  );
}
