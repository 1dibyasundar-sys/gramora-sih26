export const USER_ROLES = ['farmer', 'fpo', 'buyer', 'consumer', 'logistics', 'admin'] as const;
export type CanonicalRole = (typeof USER_ROLES)[number];
export type UserRole = CanonicalRole | 'bulk_buyer';
export type Role = UserRole;

/**
 * Normalizes any role input (including legacy 'bulk_buyer' and uppercase variants)
 * into a single canonical application role.
 */
export function normalizeRole(role: string): CanonicalRole {
  const normalized = role.toLowerCase().trim();
  if (normalized === 'bulk_buyer' || normalized === 'buyer') return 'buyer';
  if (normalized === 'farmer') return 'farmer';
  if (normalized === 'fpo') return 'fpo';
  if (normalized === 'consumer') return 'consumer';
  if (normalized === 'logistics') return 'logistics';
  if (normalized === 'admin') return 'admin';
  return 'consumer';
}

export interface FarmerProfile {
  kisanId?: string;
  landHoldingAcres?: number;
  landArea?: number;
  primaryCrops?: string[];
}

export interface FPOProfile {
  fpoRegNumber: string;
  memberFarmersCount: number;
  aggregationDistricts?: string[];
}

export interface BuyerProfile {
  gstin: string;
  businessType: 'supermarket' | 'processing' | 'horeca' | 'exporter';
  procurementCycle?: string;
}

export interface ConsumerProfile {
  deliveryInstructions?: string;
}

export interface LogisticsProfile {
  fleetSize: number;
  primaryVehicleType: string;
  corridorStates?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  organization?: string;
  location?: {
    villageOrCity?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  avatarUrl?: string;
  verified: boolean;
  joinedDate: string;
  rating?: number;
  // Specific role metadata
  farmerProfile?: FarmerProfile;
  fpoProfile?: FPOProfile;
  buyerProfile?: BuyerProfile;
  consumerProfile?: ConsumerProfile;
  logisticsProfile?: LogisticsProfile;
  // Compatibility getters/fields
  kisanId?: string;
  fpoRegNumber?: string;
  gstin?: string;
}

export type ProductCategory =
  | 'grains'
  | 'pulses'
  | 'vegetables'
  | 'fruits'
  | 'spices'
  | 'oilseeds'
  | 'organic';

export type QualityGrade =
  | 'Grade A (Export)'
  | 'Grade A'
  | 'Grade B'
  | 'Organic Certified';

export type StorageType =
  | 'Cold Storage'
  | 'Ambient Warehouse'
  | 'Farm Gate Dry';

export interface ProductFilterOptions {
  category?: ProductCategory | 'all';
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  qualityGrade?: QualityGrade | '';
  organicOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  sellerId?: string;
}

export interface PriceBreakdown {
  directFarmerEarning: number;
  logisticsCost: number;
  platformFee: number;
  totalDirectPrice: number;
  traditionalMandiPrice: number;
  consumerSavingsPercent: number;
  farmerUpliftPercent: number;
}

export type ProductListingStatus =
  | 'draft'
  | 'pending_verification'
  | 'active'
  | 'paused'
  | 'sold_out'
  | 'out_of_stock'
  | 'archived';

export type ProductLotStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'depleted'
  | 'expired'
  | 'blocked';

export type InventoryLotStatus =
  | 'in_stock'
  | 'low_stock'
  | 'reserved'
  | 'sold_out'
  | 'depleted'
  | 'critical'
  | 'expired';

/**
 * Product represents a high-level catalog entity.
 * Batch-specific properties (lots, harvest dates, storage facilities)
 * belong to ProductLot and InventoryItem.
 */
export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  subcategory?: string;
  variety: string;
  pricePerUnit: number;
  pricePerUnitPaise?: number; // Integer minor currency units (paise)
  unit: 'kg' | 'quintal' | 'tonne' | 'crate' | 'box';
  marketMandiPrice: number;
  minOrderQuantity: number;
  totalAvailableQuantity: number;
  listingStatus?: ProductListingStatus;
  location: {
    district: string;
    state: string;
    distanceKm?: number;
  };
  sellerId: string;
  sellerName: string;
  sellerType: 'farmer' | 'fpo';
  sellerRating: number;
  sellerVerified: boolean;
  images: string[];
  harvestDate: string;
  shelfLifeDays: number;
  qualityGrade: QualityGrade;
  moistureContentPercent?: number;
  storageType: StorageType;
  description: string;
  organicCertified: boolean;
  featured?: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ProductLot represents a specific harvested batch with individual QC scores and location.
 */
export interface ProductLot {
  id: string;
  productId: string;
  sellerId?: string;
  productName: string;
  lotNumber: string;
  harvestDate: string;
  expiryDate: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  unit: string;
  qualityGrade: QualityGrade;
  qualityScore: number; // 0 - 100
  moistureContentPercent?: number;
  storageType: StorageType;
  storageFacility: string;
  status: 'In Stock' | 'Low Stock' | 'Reserved' | 'Critical' | ProductLotStatus;
  lotStatus?: ProductLotStatus;
  agmarkGrade?: string;
  farmGatePrice?: number;
  sellingPrice?: number;
  minOrderQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * InventoryLot represents physical stock in warehouse or storage facility.
 */
export interface InventoryLot {
  id: string;
  productLotId: string;
  productId: string;
  ownerId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  warehouseLocation: string;
  storageCondition: string;
  receivedAt: string;
  expiryDate: string;
  status: InventoryLotStatus;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'escrow_funded'
  | 'processing'
  | 'dispatched'
  | 'pending_confirmation'
  | 'confirmed'
  | 'harvesting'
  | 'packed'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';


export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  grade: string;
  image?: string;
  lotNumber?: string;
}

export interface OrderTimelineStep {
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  current: boolean;
  location?: string;
}

export interface ColdChainTelemetry {
  currentTempCelsius: number;
  targetTempCelsius: number;
  humidityPercent: number;
  sensorStatus: 'Optimal' | 'Warning' | 'Critical';
  batteryLevel: number;
  lastUpdated: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerRole: 'consumer' | 'bulk_buyer';
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  subtotal: number;
  logisticsFee: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'escrow_locked' | 'disbursed' | 'refunded' | 'failed';
  escrowStatus?: 'unfunded' | 'held_in_escrow' | 'released_to_seller' | 'refunded_to_buyer';
  createdAt: string;
  estimatedDelivery: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    contactPhone: string;
  };
  timeline: OrderTimelineStep[];
  coldChainTelemetry?: ColdChainTelemetry;
  routeId?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  routeId: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  currentLocation?: string;
  status: OrderStatus;
  estimatedArrival: string;
  telemetry?: ColdChainTelemetry;
}

export interface InventoryItem extends ProductLot {
  minReorderThreshold: number;
}

export interface ForecastDataPoint {
  date: string;
  price: number;
  demandIndex: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

export interface DemandForecast {
  crop: string;
  variety: string;
  currentMandiPrice: number;
  predictedPriceNextMonth: number;
  priceDeltaPercent: number;
  demandTrend: 'surging' | 'stable' | 'declining';
  confidenceScorePercent: number;
  historicalTrend: ForecastDataPoint[];
  forecastTrend: ForecastDataPoint[];
  advisoryNote: string;
  optimalHarvestWindow: string;
}

export interface RouteStop {
  id: string;
  sequence: number;
  type: 'pickup' | 'hub' | 'dropoff';
  locationName: string;
  district: string;
  coordinates: { lat: number; lng: number };
  contactPerson: string;
  contactPhone: string;
  cargoDescription: string;
  weightKg: number;
  scheduledTime: string;
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
}

export interface Route {
  id: string;
  routeNumber: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType: 'Refrigerated 5T' | 'Insulated 3T' | 'Electric Cargo 1.5T';
  vehicleCapacityKg: number;
  currentLoadKg: number;
  stopsCount: number;
  totalDistanceKm: number;
  estimatedDurationHours: number;
  status: 'planned' | 'in_progress' | 'completed';
  stops: RouteStop[];
  fuelSavedLiters: number;
  co2AvoidedKg: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'inventory' | 'forecast' | 'system' | 'route';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
