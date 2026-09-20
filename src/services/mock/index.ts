import {
  IProductService,
  IOrderService,
  IForecastService,
  IRouteService,
  IUserService,
  INotificationService,
  ProductFilterOptions,
} from '../interfaces';
import {
  Product,
  Order,
  OrderStatus,
  InventoryItem,
  DemandForecast,
  Route,
  User,
  UserRole,
  Notification,
} from '@/types';
import { MOCK_PRODUCTS } from '@/mocks/products';
import { MOCK_ORDERS } from '@/mocks/orders';
import { MOCK_INVENTORY } from '@/mocks/inventory';
import { MOCK_FORECASTS } from '@/mocks/forecasts';
import { MOCK_ROUTES } from '@/mocks/routes';
import { MOCK_USERS } from '@/mocks/users';
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications';

const delay = (ms: number = 80) => new Promise((resolve) => setTimeout(resolve, ms));

class MockProductService implements IProductService {
  private products: Product[] = [...MOCK_PRODUCTS];
  private inventory: InventoryItem[] = [...MOCK_INVENTORY];

  async getProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    await delay();
    let result = [...this.products];

    if (filters?.category && filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.variety.toLowerCase().includes(q) ||
          p.location.district.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q)
      );
    }
    if (filters?.minPrice !== undefined) {
      result = result.filter((p) => p.pricePerUnit >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      result = result.filter((p) => p.pricePerUnit <= filters.maxPrice!);
    }
    if (filters?.organicOnly) {
      result = result.filter((p) => p.organicCertified);
    }
    if (filters?.qualityGrade) {
      result = result.filter((p) => p.qualityGrade === filters.qualityGrade);
    }
    if (filters?.sortBy) {
      if (filters.sortBy === 'price_asc') result.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
      if (filters.sortBy === 'price_desc') result.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
      if (filters.sortBy === 'rating') result.sort((a, b) => b.sellerRating - a.sellerRating);
    }

    return result;
  }

  async getProductById(id: string): Promise<Product | null> {
    await delay();
    return this.products.find((p) => p.id === id) || null;
  }

  async createProduct(data: Omit<Product, 'id'>): Promise<Product> {
    await delay();
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    await delay();
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    this.products[index] = { ...this.products[index], ...updates };
    return this.products[index];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await delay();
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    await delay();
    return this.products.filter((p) => p.featured);
  }

  async getInventory(): Promise<InventoryItem[]> {
    await delay();
    return [...this.inventory];
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    await delay();
    const idx = this.inventory.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');
    this.inventory[idx] = { ...this.inventory[idx], ...updates };
    return this.inventory[idx];
  }
}

class MockOrderService implements IOrderService {
  private orders: Order[] = [...MOCK_ORDERS];

  async getOrders(role?: UserRole, userId?: string, status?: OrderStatus | 'all'): Promise<Order[]> {
    await delay();
    let res = [...this.orders];
    if (status && status !== 'all') {
      res = res.filter((o) => o.status === status);
    }
    if (role === 'farmer') {
      res = res.filter((o) => o.sellerId === 'usr-farmer-01');
    }
    if (role === 'bulk_buyer' || role === 'consumer') {
      res = res.filter((o) => o.buyerId === 'usr-buyer-01' || o.buyerId === 'usr-consumer-01');
    }
    return res;
  }

  async getOrderById(id: string): Promise<Order | null> {
    await delay();
    return this.orders.find((o) => o.id === id) || null;
  }

  async createOrder(data: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order> {
    await delay();
    const newOrder: Order = {
      ...data,
      id: `ord-${Date.now()}`,
      orderNumber: `AGRI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay();
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');
    order.status = status;
    return order;
  }
}

class MockForecastService implements IForecastService {
  private forecasts: DemandForecast[] = [...MOCK_FORECASTS];

  async getForecasts(): Promise<DemandForecast[]> {
    await delay();
    return [...this.forecasts];
  }

  async getForecastByCrop(crop: string): Promise<DemandForecast | null> {
    await delay();
    return this.forecasts.find((f) => f.crop.toLowerCase().includes(crop.toLowerCase())) || null;
  }
}

class MockRouteService implements IRouteService {
  private routes: Route[] = [...MOCK_ROUTES];

  async getRoutes(): Promise<Route[]> {
    await delay();
    return [...this.routes];
  }

  async getRouteById(id: string): Promise<Route | null> {
    await delay();
    return this.routes.find((r) => r.id === id) || null;
  }

  async updateStopStatus(
    routeId: string,
    stopId: string,
    status: 'pending' | 'arrived' | 'completed' | 'skipped'
  ): Promise<Route> {
    await delay();
    const route = this.routes.find((r) => r.id === routeId);
    if (!route) throw new Error('Route not found');
    const stop = route.stops.find((s) => s.id === stopId);
    if (stop) stop.status = status;
    return route;
  }
}

class MockUserService implements IUserService {
  private activeRole: UserRole = 'farmer';
  private users: Record<string, User> = { ...MOCK_USERS };

  async getCurrentUser(): Promise<User> {
    await delay();
    return this.users[this.activeRole] || this.users.farmer;
  }

  async switchUserRole(role: UserRole): Promise<User> {
    await delay();
    this.activeRole = role;
    return this.users[role] || this.users.farmer;
  }

  async getUserById(id: string): Promise<User | null> {
    await delay();
    const found = Object.values(this.users).find((u) => u.id === id);
    return found || null;
  }

  async updateProfile(id: string, updates: Partial<User>): Promise<User> {
    await delay();
    const roleKey = Object.keys(this.users).find((k) => this.users[k].id === id);
    if (roleKey) {
      this.users[roleKey] = { ...this.users[roleKey], ...updates };
      return this.users[roleKey];
    }
    throw new Error('User not found');
  }

  async getAllUsers(): Promise<User[]> {
    await delay();
    return Object.values(this.users);
  }
}

class MockNotificationService implements INotificationService {
  private notifications: Notification[] = [...MOCK_NOTIFICATIONS];

  async getNotifications(): Promise<Notification[]> {
    await delay();
    return [...this.notifications];
  }

  async markAsRead(id: string): Promise<void> {
    await delay();
    const n = this.notifications.find((item) => item.id === id);
    if (n) n.read = true;
  }

  async markAllAsRead(): Promise<void> {
    await delay();
    this.notifications.forEach((n) => (n.read = true));
  }
}

export const mockProductService = new MockProductService();
export const mockUserService = new MockUserService();
export const productService = mockProductService;
export const orderService = new MockOrderService();
export const forecastService = new MockForecastService();
export const routeService = new MockRouteService();
export const userService = mockUserService;
export const notificationService = new MockNotificationService();
