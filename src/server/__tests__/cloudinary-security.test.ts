import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  generateCloudinarySignature,
  getDeterministicFolder,
  validateUploadAuthorization,
  createUploadSignature,
  assertAssetOwnership,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '../lib/cloudinary';
import { getOptimizedImageUrl, extractPublicIdFromUrl, isCloudinaryUrl } from '@/lib/cloudinary';
import { AuthenticatedUser } from '../auth/verify-token';

console.log('====================================================');
console.log('STARTING CLOUDINARY SECURITY & INTEGRATION TEST SUITE');
console.log('====================================================');

const mockFarmerA: AuthenticatedUser = {
  uid: 'farmer-alpha-001',
  role: 'farmer',
  name: 'Ramesh Patel',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

const mockFarmerB: AuthenticatedUser = {
  uid: 'farmer-beta-002',
  role: 'farmer',
  name: 'Suresh Kumar',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

const mockBuyer: AuthenticatedUser = {
  uid: 'buyer-commercial-003',
  role: 'buyer',
  name: 'FreshMart Procurement',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

const mockConsumer: AuthenticatedUser = {
  uid: 'consumer-retail-004',
  role: 'consumer',
  name: 'Anita Sharma',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

const mockAdmin: AuthenticatedUser = {
  uid: 'admin-platform-005',
  role: 'admin',
  name: 'Platform Ops Admin',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

// TEST 1: Cloudinary Signature Hashing Determinism
console.log('\nTEST 1: Cloudinary SHA-1 signature hashing matches specification');
const testParams = {
  folder: 'gramora/products/test-uid',
  timestamp: 1726000000,
};
const testSecret = 'sample_secret_key_123';
const expectedStringToSign = 'folder=gramora/products/test-uid&timestamp=1726000000sample_secret_key_123';
const expectedHash = crypto.createHash('sha1').update(expectedStringToSign).digest('hex');
const computedHash = generateCloudinarySignature(testParams, testSecret);
assert.strictEqual(computedHash, expectedHash, 'Signature must match SHA-1 of alphabetically sorted parameters');
console.log('✔ Passed: Deterministic SHA-1 signature generation verified.');

// TEST 2: Deterministic Namespace Resolution
console.log('\nTEST 2: Deterministic namespace folders strictly isolated by UID');
assert.strictEqual(
  getDeterministicFolder('product', mockFarmerA),
  'gramora/products/farmer-alpha-001',
  'Product folder must strictly match gramora/products/{sellerId}'
);
assert.strictEqual(
  getDeterministicFolder('avatar', mockConsumer),
  'gramora/users/consumer-retail-004',
  'Avatar folder must strictly match gramora/users/{uid}'
);
console.log('✔ Passed: Folder namespace isolation verified.');

// TEST 3: RBAC Authorization on Product Image Uploads
console.log('\nTEST 3: RBAC blocks non-sellers from requesting product upload authorization');
assert.throws(
  () => {
    validateUploadAuthorization(mockBuyer, { targetType: 'product' });
  },
  (err: any) => err.statusCode === 403,
  'Buyer role must be rejected with 403 FORBIDDEN when attempting product upload'
);
assert.throws(
  () => {
    validateUploadAuthorization(mockConsumer, { targetType: 'product' });
  },
  (err: any) => err.statusCode === 403,
  'Consumer role must be rejected with 403 FORBIDDEN when attempting product upload'
);
// Farmer and Admin must succeed
assert.doesNotThrow(() => {
  validateUploadAuthorization(mockFarmerA, { targetType: 'product' });
});
assert.doesNotThrow(() => {
  validateUploadAuthorization(mockAdmin, { targetType: 'product' });
});
console.log('✔ Passed: RBAC properly guards product image upload capability.');

// TEST 4: Cross-Tenant Seller Image Namespace Isolation
console.log('\nTEST 4: Cross-tenant upload protection (Farmer A cannot upload for Farmer B product)');
assert.throws(
  () => {
    // Farmer A requesting signature for Farmer B's product
    validateUploadAuthorization(mockFarmerA, { targetType: 'product', productId: 'prod-b-1' }, mockFarmerB.uid);
  },
  (err: any) => err.statusCode === 403,
  'Farmer A uploading for Farmer B product must be rejected with 403 FORBIDDEN'
);
// Admin can upload for any product
assert.doesNotThrow(() => {
  validateUploadAuthorization(mockAdmin, { targetType: 'product', productId: 'prod-b-1' }, mockFarmerB.uid);
});
console.log('✔ Passed: Cross-tenant product image ownership boundary strictly enforced.');

// TEST 5: MIME Type and Format Validation
console.log('\nTEST 5: Server-side MIME type validation');
assert.throws(
  () => {
    validateUploadAuthorization(mockFarmerA, { targetType: 'product', contentType: 'application/pdf' });
  },
  (err: any) => err.statusCode === 400,
  'PDF upload must be rejected with 400 BAD_REQUEST'
);
assert.throws(
  () => {
    validateUploadAuthorization(mockFarmerA, { targetType: 'product', contentType: 'text/html' });
  },
  (err: any) => err.statusCode === 400,
  'HTML upload must be rejected with 400 BAD_REQUEST'
);
for (const mime of ALLOWED_IMAGE_MIME_TYPES) {
  assert.doesNotThrow(() => {
    validateUploadAuthorization(mockFarmerA, { targetType: 'product', contentType: mime });
  });
}
console.log('✔ Passed: MIME type whitelist strictly enforced.');

// TEST 6: File Size Limit Enforcement
console.log('\nTEST 6: Server-side file size boundary enforcement');
assert.throws(
  () => {
    validateUploadAuthorization(mockFarmerA, {
      targetType: 'product',
      fileSizeBytes: MAX_IMAGE_FILE_SIZE_BYTES + 1,
    });
  },
  (err: any) => err.statusCode === 400,
  'Oversized file (>10MB) must be rejected with 400 BAD_REQUEST'
);
assert.throws(
  () => {
    validateUploadAuthorization(mockFarmerA, {
      targetType: 'product',
      fileSizeBytes: 0,
    });
  },
  (err: any) => err.statusCode === 400,
  'Zero-byte file must be rejected with 400 BAD_REQUEST'
);
console.log('✔ Passed: File size limits verified.');

// TEST 7: Asset Namespace Ownership for Deletion
console.log('\nTEST 7: Asset deletion namespace verification');
const farmerAPublicId = 'gramora/products/farmer-alpha-001/crop_harvest_1';
const farmerBPublicId = 'gramora/products/farmer-beta-002/crop_harvest_2';

// Farmer A can manage own asset
assert.doesNotThrow(() => {
  assertAssetOwnership(mockFarmerA, farmerAPublicId);
});
// Farmer A cannot delete Farmer B's asset
assert.throws(
  () => {
    assertAssetOwnership(mockFarmerA, farmerBPublicId);
  },
  (err: any) => err.statusCode === 403,
  'Cross-tenant deletion attempt must throw 403 FORBIDDEN'
);
// Admin can manage Farmer B's asset
assert.doesNotThrow(() => {
  assertAssetOwnership(mockAdmin, farmerBPublicId);
});
console.log('✔ Passed: Asset deletion namespace ownership verified.');

// TEST 8: Cloudinary URL Transformation & Optimization Helper
console.log('\nTEST 8: URL transformation helper injection and safety');
const rawCloudinaryUrl = 'https://res.cloudinary.com/gramora-cloud/image/upload/v1726000000/gramora/products/farmer-alpha-001/wheat.jpg';
const optimizedUrl = getOptimizedImageUrl(rawCloudinaryUrl, { width: 800, height: 600, crop: 'fill' });
assert.ok(optimizedUrl.includes('f_auto,q_auto,c_fill,w_800,h_600'), 'Optimized URL must include transformation string');
assert.ok(isCloudinaryUrl(rawCloudinaryUrl), 'isCloudinaryUrl correctly recognizes Cloudinary domain');

// Non-Cloudinary URLs left untouched
const externalUrl = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800';
assert.strictEqual(getOptimizedImageUrl(externalUrl), externalUrl, 'External URLs must not be modified');
assert.strictEqual(isCloudinaryUrl(externalUrl), false, 'isCloudinaryUrl returns false for external URLs');

// Public ID extraction
const extractedPublicId = extractPublicIdFromUrl(rawCloudinaryUrl);
assert.strictEqual(extractedPublicId, 'gramora/products/farmer-alpha-001/wheat', 'Public ID correctly extracted');
console.log('✔ Passed: URL optimization and public ID extraction verified.');

// TEST 9: Unconfigured Cloudinary Handling
console.log('\nTEST 9: Unconfigured Cloudinary handling');
// If process.env does not have valid Cloudinary credentials, createUploadSignature throws 503
try {
  createUploadSignature(mockFarmerA, { targetType: 'product' });
  console.log('✔ Cloudinary credentials detected in environment: signature generated successfully.');
} catch (err: any) {
  assert.strictEqual(err.statusCode, 503, 'Missing credentials must throw 503 SERVICE_UNAVAILABLE');
  console.log('✔ Passed: Clean 503 SERVICE_UNAVAILABLE returned when Cloudinary is unconfigured.');
}

console.log('\n====================================================');
console.log('ALL 9/9 CLOUDINARY SECURITY & INTEGRATION TESTS PASSED!');
console.log('====================================================\n');
