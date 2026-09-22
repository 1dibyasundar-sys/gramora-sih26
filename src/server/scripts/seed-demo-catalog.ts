/**
 * Seeding script to upload local AI-generated crop images to Cloudinary
 * and create realistic demo catalog entries in Firestore.
 */

import { getFirestore } from '../lib/firebase-admin';
import { v2 as cloudinaryClient } from 'cloudinary';
import { getCloudinaryConfig } from '../config/env';
import { COLLECTIONS } from '../repositories/collections';
import { productService } from '../services/product.service';
import * as path from 'path';
import * as fs from 'fs';
import { AuthenticatedUser } from '../auth/verify-token';

const DEMO_SELLER: AuthenticatedUser = {
  uid: 'gramora-demo-farmer',
  email: 'demo@gramora.farm',
  role: 'farmer',
  name: 'Gramora Demo Farm',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: {},
};

const CROPS = [
  {
    key: 'nashik_red_onions',
    title: 'Nashik Red Onions',
    category: 'vegetables',
    unit: 'kg',
    pricePerUnit: 35,
    minOrderQuantity: 50,
    tags: ['Onion', 'Nashik', 'Fresh'],
    description: 'Premium quality Nashik red onions, known for their pungent flavor and long shelf life. Hand-sorted and naturally dried.',
    shelfLifeDays: 45,
    storageType: 'Dry Ambient Warehouse',
  },
  {
    key: 'alphonso_mangoes',
    title: 'Alphonso Mangoes',
    category: 'fruits',
    unit: 'kg',
    pricePerUnit: 120,
    minOrderQuantity: 20,
    tags: ['Mango', 'Alphonso', 'Ratnagiri', 'Organic'],
    description: 'Fresh organic Alphonso mangoes from Ratnagiri. Rich, sweet, and aromatic. Perfect for direct consumption or processing.',
    shelfLifeDays: 14,
    storageType: 'Cool Dry Storage',
  },
  {
    key: 'sharbati_wheat',
    title: 'Sharbati Wheat',
    category: 'grains',
    unit: 'quintal',
    pricePerUnit: 3200,
    minOrderQuantity: 5,
    tags: ['Wheat', 'Sharbati', 'MP Wheat'],
    description: 'Golden Sharbati wheat grains from Madhya Pradesh. High protein content, clean and well-dried for immediate milling.',
    shelfLifeDays: 180,
    storageType: 'Silo / Dry Warehouse',
  },
  {
    key: 'export_garlic',
    title: 'Export Quality Garlic',
    category: 'vegetables',
    unit: 'kg',
    pricePerUnit: 85,
    minOrderQuantity: 30,
    tags: ['Garlic', 'Export Quality', 'White Bulb'],
    description: 'Large, clean, white garlic bulbs. Export grade with strong aroma. Properly cured for extended storage.',
    shelfLifeDays: 90,
    storageType: 'Dry Ventilated Warehouse',
  },
  {
    key: 'organic_tomatoes',
    title: 'Organic Vine Tomatoes',
    category: 'vegetables',
    unit: 'kg',
    pricePerUnit: 40,
    minOrderQuantity: 50,
    tags: ['Tomato', 'Organic', 'Vine-ripened'],
    description: 'Vibrant, vine-ripened organic red tomatoes. Firm texture and excellent shelf life. Ideal for retail and processing.',
    shelfLifeDays: 10,
    storageType: 'Cold Storage (10-15°C)',
  },
  {
    key: 'basmati_rice',
    title: 'Premium Basmati Rice',
    category: 'grains',
    unit: 'quintal',
    pricePerUnit: 9500,
    minOrderQuantity: 2,
    tags: ['Rice', 'Basmati', 'Long Grain'],
    description: 'Aged long-grain white basmati rice. Aromatic and perfectly milled. Suitable for export and domestic premium markets.',
    shelfLifeDays: 365,
    storageType: 'Dry Warehouse',
  },
  {
    key: 'pomegranates',
    title: 'Bhagwa Pomegranates',
    category: 'fruits',
    unit: 'kg',
    pricePerUnit: 110,
    minOrderQuantity: 30,
    tags: ['Pomegranate', 'Bhagwa', 'Fresh Fruit'],
    description: 'Deep red Bhagwa variety pomegranates. Juicy, sweet ruby-red arils with soft seeds. Farm-fresh harvest.',
    shelfLifeDays: 21,
    storageType: 'Cold Storage (5°C)',
  },
  {
    key: 'fresh_lemons',
    title: 'Fresh Yellow Lemons',
    category: 'fruits',
    unit: 'kg',
    pricePerUnit: 60,
    minOrderQuantity: 20,
    tags: ['Lemon', 'Citrus', 'Fresh'],
    description: 'Bright yellow, juicy lemons. Rich in Vitamin C. Carefully picked and graded for uniformity.',
    shelfLifeDays: 15,
    storageType: 'Cool Ambient Storage',
  },
  {
    key: 'green_chillies',
    title: 'Spicy Green Chillies',
    category: 'vegetables',
    unit: 'kg',
    pricePerUnit: 45,
    minOrderQuantity: 20,
    tags: ['Chilli', 'Spicy', 'Green'],
    description: 'Vibrant green, highly pungent chillies. Hand-picked and packed on the same day to retain crispness.',
    shelfLifeDays: 7,
    storageType: 'Cool Storage',
  },
  {
    key: 'cabbage',
    title: 'Fresh Green Cabbage',
    category: 'vegetables',
    unit: 'kg',
    pricePerUnit: 25,
    minOrderQuantity: 100,
    tags: ['Cabbage', 'Leafy', 'Farm Fresh'],
    description: 'Compact, round green cabbage heads. Crisp and free from pest damage. Harvested at optimal maturity.',
    shelfLifeDays: 12,
    storageType: 'Cold Storage (0-2°C)',
  },
  // --- PULSES & LENTILS ---
  {
    key: 'toor_dal',
    title: 'Organic Toor Dal (Pigeon Pea)',
    category: 'pulses',
    unit: 'kg',
    pricePerUnit: 145,
    minOrderQuantity: 25,
    tags: ['Toor Dal', 'Pigeon Pea', 'Pulses', 'Organic'],
    description: 'Unpolished organic toor dal (arhar dal) sourced directly from certified organic farms in Latur. High protein, naturally sun-dried, chemical-free processing.',
    shelfLifeDays: 180,
    storageType: 'Ambient Warehouse',
  },
  {
    key: 'chickpeas',
    title: 'Premium Kabuli Chickpeas (Chana)',
    category: 'pulses',
    unit: 'quintal',
    pricePerUnit: 7800,
    minOrderQuantity: 2,
    tags: ['Chickpeas', 'Kabuli Chana', 'Pulses', 'Grade A'],
    description: 'Export-quality bold 12mm Kabuli chickpeas. Uniform size, high dietary fiber, excellent boiling texture. Ideal for wholesale institutional procurement.',
    shelfLifeDays: 240,
    storageType: 'Ambient Warehouse',
  },
  // --- SPICES & CONDIMENTS ---
  {
    key: 'turmeric',
    title: 'Salem Golden Turmeric Finger',
    category: 'spices',
    unit: 'kg',
    pricePerUnit: 180,
    minOrderQuantity: 20,
    tags: ['Turmeric', 'Salem Variety', 'Spices', 'High Curcumin'],
    description: 'Authentic Salem golden whole turmeric fingers with high 4.8% curcumin content. Naturally cured and unpolished for medicinal and culinary excellence.',
    shelfLifeDays: 365,
    storageType: 'Farm Gate Dry',
  },
  {
    key: 'cumin_seeds',
    title: 'Aromatic Whole Cumin Seeds (Jeera)',
    category: 'spices',
    unit: 'kg',
    pricePerUnit: 340,
    minOrderQuantity: 15,
    tags: ['Cumin', 'Jeera', 'Spices', 'Aromatic'],
    description: 'Machine-cleaned machine-sorted whole cumin seeds from Unjha mandi belt. Rich essential oil aroma, 99.5% purity, zero foreign matter.',
    shelfLifeDays: 365,
    storageType: 'Farm Gate Dry',
  },
  // --- OILSEEDS ---
  {
    key: 'mustard_seeds',
    title: 'High-Oil Black Mustard Seeds (Sarson)',
    category: 'oilseeds',
    unit: 'quintal',
    pricePerUnit: 5800,
    minOrderQuantity: 3,
    tags: ['Mustard', 'Sarson', 'Oilseeds', 'High Oil'],
    description: 'Clean bold black mustard seeds with exceptional 42% oil recovery. Low moisture content, thoroughly sorted for direct cold-pressing (Kachi Ghani).',
    shelfLifeDays: 270,
    storageType: 'Ambient Warehouse',
  },
  {
    key: 'groundnuts',
    title: 'Shelled Bold Groundnuts (Peanuts)',
    category: 'oilseeds',
    unit: 'quintal',
    pricePerUnit: 7200,
    minOrderQuantity: 2,
    tags: ['Groundnut', 'Peanut', 'Oilseeds', 'Bold 40/50'],
    description: 'Shelled bold 40/50 count groundnuts from Saurashtra. Aflatoxin-tested, crisp red-skin kernels with high oleic acid and healthy fats.',
    shelfLifeDays: 180,
    storageType: 'Ambient Warehouse',
  },
];

const ARTIFACT_DIRS = [
  'C:/Users/Asus/.gemini/antigravity-ide/brain/997f6065-812c-4527-810f-27ccb38d2072',
  'C:/Users/Asus/.gemini/antigravity-ide/brain/22de2a17-b397-4de2-9a87-0fdd3ffa032d',
];

function findLocalImage(cropKey: string): string | null {
  for (const dir of ARTIFACT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    const matchingFile = files.find((f) => f.startsWith(cropKey) && f.endsWith('.jpg'));
    if (matchingFile) {
      return path.join(dir, matchingFile);
    }
  }
  return null;
}

async function seedDemoCatalog() {
  console.log('====================================================');
  console.log('SEEDING DEMO CATALOG WITH REALISTIC AGRICULTURAL DATA');
  console.log('====================================================\n');

  const cloudinaryConf = getCloudinaryConfig();
  cloudinaryClient.config({
    cloud_name: cloudinaryConf.cloudName,
    api_key: cloudinaryConf.apiKey,
    api_secret: cloudinaryConf.apiSecret,
  });

  const db = getFirestore();

  // Ensure demo farmer exists in DB
  const userRef = db.collection(COLLECTIONS.USERS).doc(DEMO_SELLER.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    console.log(`Creating demo farmer profile for ${DEMO_SELLER.uid}...`);
    await userRef.set({
      email: DEMO_SELLER.email,
      role: DEMO_SELLER.role,
      name: DEMO_SELLER.name,
      phone: '9999999999',
      verified: true,
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
      location: { district: 'Pune', state: 'Maharashtra' },
      rating: 5,
    });
  }

  for (const crop of CROPS) {
    const premiumTitle = `Premium Grade A ${crop.title}`;
    const standardTitle = `Standard ${crop.title}`;

    // 1. Check idempotency in Firestore
    const existingPremiumSnap = await db
      .collection(COLLECTIONS.PRODUCTS)
      .where('sellerId', '==', DEMO_SELLER.uid)
      .where('title', '==', premiumTitle)
      .limit(1)
      .get();

    const existingStandardSnap = await db
      .collection(COLLECTIONS.PRODUCTS)
      .where('sellerId', '==', DEMO_SELLER.uid)
      .where('title', '==', standardTitle)
      .limit(1)
      .get();

    if (!existingPremiumSnap.empty && !existingStandardSnap.empty) {
      console.log(`[IDEMPOTENT SKIP] Both variants for "${crop.title}" already exist in Firestore.`);
      continue;
    }

    // 2. Locate local image
    const localPath = findLocalImage(crop.key);
    if (!localPath) {
      console.warn(`[WARN] Could not find local generated image for ${crop.key}. Skipping...`);
      continue;
    }

    console.log(`\nProcessing ${crop.title}...`);
    console.log(`Uploading ${localPath} to Cloudinary...`);

    try {
      const uploadResult = await cloudinaryClient.uploader.upload(localPath, {
        folder: 'gramora/products/demo',
        public_id: crop.key,
        overwrite: true,
        resource_type: 'image',
      });

      const secureUrl = uploadResult.secure_url;
      console.log(`Successfully uploaded: ${secureUrl}`);

      // Create Premium Grade Variant if not already present
      if (existingPremiumSnap.empty) {
        const premiumReq = {
          title: premiumTitle,
          category: crop.category as any,
          variety: crop.title.split(' ')[0],
          pricePerUnit: crop.pricePerUnit,
          unit: crop.unit as any,
          minOrderQuantity: crop.minOrderQuantity,
          totalAvailableQuantity: 1000,
          initialQuantity: 1000,
          location: { district: 'Pune', state: 'Maharashtra' },
          harvestDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          shelfLifeDays: crop.shelfLifeDays,
          qualityGrade: 'Grade A',
          description: crop.description + ' Premium grade, uniform size and superior quality.',
          storageType: crop.storageType,
          organicCertified: crop.tags.includes('Organic'),
          tags: [...crop.tags, 'Premium'],
          images: [secureUrl],
        };

        console.log(`Creating Premium variant in Firestore: "${premiumTitle}"...`);
        const premiumProduct = await productService.createProduct(DEMO_SELLER, premiumReq as any);
        console.log(`Created Premium Product ID: ${premiumProduct.id}`);
      } else {
        console.log(`[EXISTS] Premium variant "${premiumTitle}" already exists.`);
      }

      // Create Standard Grade Variant if not already present
      if (existingStandardSnap.empty) {
        const standardReq = {
          title: standardTitle,
          category: crop.category as any,
          variety: crop.title.split(' ')[0],
          pricePerUnit: Math.floor(crop.pricePerUnit * 0.8), // 20% cheaper
          unit: crop.unit as any,
          minOrderQuantity: crop.minOrderQuantity,
          totalAvailableQuantity: 2500,
          initialQuantity: 2500,
          location: { district: 'Pune', state: 'Maharashtra' },
          harvestDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          shelfLifeDays: crop.shelfLifeDays,
          qualityGrade: 'Grade B',
          description: crop.description + ' Standard grade, great value for processing and bulk retail.',
          storageType: crop.storageType,
          organicCertified: crop.tags.includes('Organic'),
          tags: [...crop.tags, 'Standard'],
          images: [secureUrl],
        };

        console.log(`Creating Standard variant in Firestore: "${standardTitle}"...`);
        const standardProduct = await productService.createProduct(DEMO_SELLER, standardReq as any);
        console.log(`Created Standard Product ID: ${standardProduct.id}`);
      } else {
        console.log(`[EXISTS] Standard variant "${standardTitle}" already exists.`);
      }
    } catch (err: any) {
      console.error(`[ERROR] Failed to process ${crop.key}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');
}

seedDemoCatalog().catch(console.error);
