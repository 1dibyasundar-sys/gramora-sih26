'use client';

import React, { useState, useRef } from 'react';
import { AppImage } from '@/components/data-display/app-image';
import { Button } from '@/components/ui/button';
import { extractPublicIdFromUrl, isCloudinaryUrl } from '@/lib/cloudinary';
import { UploadCloud, X, AlertCircle, Loader2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  targetType?: 'product' | 'avatar';
  productId?: string;
  maxImages?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

interface UploadProgressItem {
  id: string;
  fileName: string;
  progress: number;
  error?: string;
}

export function ImageUploader({
  images,
  onChange,
  targetType = 'product',
  productId,
  maxImages = 5,
  label = 'Product Images',
  description = 'Upload up to 5 clear photographs of your harvest lot (JPEG, PNG, WebP up to 10MB)',
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState<UploadProgressItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled || uploading) return;
    setErrorMessage(null);

    const fileList = Array.from(files);
    if (images.length + fileList.length > maxImages) {
      setErrorMessage(`You can only upload up to ${maxImages} images in total.`);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('You must be signed in to upload media.');
      return;
    }

    setUploading(true);

    for (const file of fileList) {
      // 1. Client-side MIME validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`File '${file.name}' has an unsupported format. Please upload JPEG, PNG, or WebP.`);
        continue;
      }

      // 2. Client-side size validation (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File '${file.name}' exceeds the 10MB size limit.`);
        continue;
      }

      const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setActiveUploads((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 10 }]);

      try {
        // 3. Request server-signed upload parameters
        const sigRes = await fetch('/api/v1/media/upload-signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetType,
            productId,
            contentType: file.type,
            fileSizeBytes: file.size,
          }),
        });

        if (!sigRes.ok) {
          const errData = await sigRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Signature request failed (${sigRes.status})`;

          if (sigRes.status === 503) {
            setErrorMessage(
              'Cloudinary storage is currently unconfigured on this server. You can provide a direct image URL below as a fallback.'
            );
            setShowUrlFallback(true);
            break;
          }
          throw new Error(errMsg);
        }

        const sigData = await sigRes.json();
        const { signature, timestamp, apiKey, folder, uploadUrl } = sigData.data;

        setActiveUploads((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, progress: 40 } : item))
        );

        // 4. Upload directly to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);

        const cloudRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!cloudRes.ok) {
          const cloudErr = await cloudRes.json().catch(() => ({}));
          throw new Error(cloudErr.error?.message || 'Direct Cloudinary upload failed');
        }

        const cloudData = await cloudRes.json();
        const secureUrl = cloudData.secure_url;

        if (secureUrl) {
          onChange([...images, secureUrl]);
        }

        setActiveUploads((prev) => prev.filter((item) => item.id !== uploadId));
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : 'Upload failed';
        setErrorMessage(errorText);
        setActiveUploads((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, error: errorText } : item))
        );
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    if (disabled) return;
    const urlToRemove = images[indexToRemove];
    const newImages = images.filter((_, idx) => idx !== indexToRemove);
    onChange(newImages);

    // If it's a Cloudinary URL, attempt safe server-mediated deletion
    if (urlToRemove && isCloudinaryUrl(urlToRemove)) {
      const publicId = extractPublicIdFromUrl(urlToRemove);
      const token = getAuthToken();
      if (publicId && token) {
        fetch('/api/v1/media/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ publicId }),
        }).catch(() => {
          // Non-blocking best-effort cleanup
        });
      }
    }
  };

  const handleAddManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    try {
      new URL(manualUrl);
      if (images.length >= maxImages) {
        setErrorMessage(`Maximum of ${maxImages} images reached.`);
        return;
      }
      onChange([...images, manualUrl.trim()]);
      setManualUrl('');
      setErrorMessage(null);
    } catch {
      setErrorMessage('Please enter a valid HTTP/HTTPS image URL.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-caption font-semibold text-foreground">{label}</label>
          {description && <p className="text-caption text-foreground/60">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="text-xs text-primary-400 hover:text-primary-300 underline flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlFallback ? 'Hide URL Input' : 'Add Image URL'}
        </button>
      </div>

      {/* Manual URL Input Fallback */}
      {showUrlFallback && (
        <div className="p-3 bg-surface-elevated/70 border border-surface-border rounded-xl space-y-2">
          <p className="text-xs text-foreground/70">Enter external image link (e.g. Unsplash or hosted crop image):</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://images.example.com/produce.jpg"
              className="flex-1 px-3 py-1.5 text-sm bg-surface-base border border-surface-border rounded-lg text-foreground focus:outline-none focus:border-primary-500"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleAddManualUrl}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Thumbnails Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            className="relative group rounded-xl overflow-hidden border border-surface-border bg-surface-elevated/60 aspect-square"
          >
            <AppImage
              src={imgUrl}
              alt={`Crop Photo ${idx + 1}`}
              aspectRatio="square"
              className="w-full h-full object-cover"
            />
            {idx === 0 && (
              <span className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm text-primary-300 text-[10px] font-medium px-1.5 py-0.5 rounded">
                Cover
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Action Slot */}
        {images.length < maxImages && (
          <div
            onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed border-surface-border hover:border-primary-500/70 rounded-xl aspect-square flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-surface-elevated/20 hover:bg-surface-elevated/40',
              (disabled || uploading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              disabled={disabled || uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-1.5 text-primary-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[11px] font-medium">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-foreground/60 hover:text-primary-400">
                <UploadCloud className="w-6 h-6 text-primary-500/70" />
                <span className="text-[11px] font-semibold text-foreground/80">Add Image</span>
                <span className="text-[9px] text-foreground/50">PNG, JPG, WebP</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Progress Display */}
      {activeUploads.length > 0 && (
        <div className="space-y-1 pt-1">
          {activeUploads.map((item) => (
            <div key={item.id} className="text-xs text-foreground/60 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
              <span className="truncate">{item.fileName}</span>
              {item.error ? (
                <span className="text-red-400">({item.error})</span>
              ) : (
                <span className="text-primary-400 font-mono text-[10px]">{item.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
