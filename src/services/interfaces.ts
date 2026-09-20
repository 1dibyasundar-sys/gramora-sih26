import {
  Product,
  ProductCategory,
  Order,
  OrderStatus,
  InventoryItem,
  DemandForecast,
  Route,
  User,
  UserRole,
  Notification,
} from '@/types';

export interface ProductFilterOptions {
  category?: ProductCategory | 'all';
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  qualityGrade?: string;
  organicOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  sellerId?: string;
}

export interface IProductService {
  getProducts(filters?: ProductFilterOptions): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(product: Omit<Product, 'id'>): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
  getFeaturedProducts(): Promise<Product[]>;
  getInventory(): Promise<InventoryItem[]>;
  updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem>;
}

export interface IOrderService {
  getOrders(role?: UserRole, userId?: string, status?: OrderStatus | 'all'): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  createOrder(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  createPaymentOrder?(orderId: string): Promise<{
    provider: 'razorpay';
    providerOrderId: string;
    amountPaise: number;
    currency: 'INR';
    keyId: string;
    orderNumber: string;
  }>;
  verifyPayment?(payload: {
    orderId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }): Promise<{ orderId: string; status: string; paymentStatus: string; alreadyProcessed: boolean }>;
}

export interface IForecastService {
  getForecasts(): Promise<DemandForecast[]>;
  getForecastByCrop(crop: string): Promise<DemandForecast | null>;
}

export interface IRouteService {
  getRoutes(): Promise<Route[]>;
  getRouteById(id: string): Promise<Route | null>;
  updateStopStatus(routeId: string, stopId: string, status: 'pending' | 'arrived' | 'completed' | 'skipped'): Promise<Route>;
}

export interface IUserService {
  getCurrentUser(): Promise<User>;
  switchUserRole(role: UserRole): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  updateProfile(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
}

export interface INotificationService {
  getNotifications(): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}

export interface IAuthService {
  isConfigured(): boolean;
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, onboardingData: Record<string, unknown>): Promise<User>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChanged(callback: (user: User | null, token: string | null) => void): () => void;
}
