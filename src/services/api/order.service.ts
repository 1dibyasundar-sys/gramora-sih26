import { IOrderService } from '../interfaces';
import { Order, OrderStatus, OrderItem, OrderTimelineStep, UserRole } from '@/types';
import { CheckoutInput } from '@/server/domain/order';
import { SafePaymentConfig, VerifyPaymentInput } from '@/server/domain/payment';


export class ApiOrderService implements IOrderService {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  private authHeaders(idempotencyKey?: string): HeadersInit {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  }

  /**
   * Generates a sensible timeline based on the server-authoritative status.
   */
  private buildTimeline(order: any): OrderTimelineStep[] {
    const status = order.status;
    const createdAt = order.createdAt || new Date().toISOString();

    const isCreated = true;
    const isEscrowLocked = ['escrow_funded', 'processing', 'dispatched', 'delivered', 'completed'].includes(status);
    const isProcessing = ['processing', 'dispatched', 'delivered', 'completed'].includes(status);
    const isDispatched = ['dispatched', 'delivered', 'completed'].includes(status);
    const isDelivered = ['delivered', 'completed'].includes(status);

    if (status === 'cancelled') {
      return [
        {
          title: 'Order Consignment Placed',
          description: 'Direct procurement initiated with farmer reserve',
          timestamp: createdAt,
          completed: true,
          current: false,
        },
        {
          title: 'Consignment Cancelled',
          description: order.cancellationReason || 'Order was cancelled and reserved stock returned to farm pool',
          timestamp: order.cancelledAt || createdAt,
          completed: true,
          current: true,
        },
      ];
    }

    return [
      {
        title: 'Consignment Placed',
        description: 'Direct farm order booked with stock locked',
        timestamp: createdAt,
        completed: isCreated,
        current: status === 'created' || status === 'payment_pending',
      },
      {
        title: 'Escrow Security Locked',
        description: 'Buyer funds held safely in disintermediated escrow',
        timestamp: createdAt,
        completed: isEscrowLocked,
        current: status === 'escrow_funded',
      },
      {
        title: 'Producer Harvest & Pack',
        description: 'Agronomic sorting & cold-chain pre-cooling at farm dock',
        timestamp: createdAt,
        completed: isProcessing,
        current: status === 'processing',
      },
      {
        title: 'Reefer Dispatch & Transit',
        description: 'Temperature-monitored refrigerated transport',
        timestamp: createdAt,
        completed: isDispatched,
        current: status === 'dispatched',
      },
      {
        title: 'Dock Delivery & Settlement',
        description: 'Disintermediated payout triggered upon quality verification',
        timestamp: createdAt,
        completed: isDelivered,
        current: status === 'delivered' || status === 'completed',
      },
    ];
  }

  /**
   * Adapts raw server order into the frontend Order format.
   */
  private adaptServerOrder(serverOrder: any): Order {
    const rawItems = serverOrder.items || [];
    const items: OrderItem[] = rawItems.map((item: any) => ({
      productId: item.productId,
      productName: item.productNameSnapshot || item.productName || 'Agricultural Produce',
      quantity: item.quantity,
      unit: item.unitSnapshot || item.unit || 'kg',
      pricePerUnit: item.pricePerUnit || (item.pricePerUnitMinor ? item.pricePerUnitMinor / 100 : 0),
      totalPrice: item.lineTotal || (item.lineTotalMinor ? item.lineTotalMinor / 100 : 0),
      grade: item.gradeSnapshot || item.grade || 'Grade A',
      image: item.imageSnapshot || item.image || undefined,
      lotNumber: item.productLotId || item.lotNumber || undefined,
    }));

    const address = serverOrder.shippingAddressSnapshot || {};

    return {
      id: serverOrder.id,
      orderNumber: serverOrder.orderNumber,
      buyerId: serverOrder.buyerId,
      buyerName: serverOrder.buyerName || 'Buyer',
      buyerRole: serverOrder.buyerRole === 'consumer' ? 'consumer' : 'bulk_buyer',
      sellerId: serverOrder.sellerIds?.[0] || '',
      sellerName: rawItems[0]?.sellerNameSnapshot || 'Producer Cooperative',
      items,
      subtotal: serverOrder.subtotal ?? (serverOrder.subtotalMinor ? serverOrder.subtotalMinor / 100 : 0),
      logisticsFee: serverOrder.logisticsFee ?? (serverOrder.shippingFeeMinor ? serverOrder.shippingFeeMinor / 100 : 0),
      platformFee: serverOrder.platformFee ?? (serverOrder.platformFeeMinor ? serverOrder.platformFeeMinor / 100 : 0),
      tax: serverOrder.tax ?? 0,
      totalAmount: serverOrder.totalAmount ?? (serverOrder.totalMinor ? serverOrder.totalMinor / 100 : 0),
      status: serverOrder.status as OrderStatus,
      paymentStatus: (serverOrder.paymentStatus || 'pending') as any,
      escrowStatus: serverOrder.escrowStatus || 'unfunded',
      createdAt: serverOrder.createdAt,
      estimatedDelivery: serverOrder.expiresAt || serverOrder.createdAt,
      deliveryAddress: {
        street: address.addressLine1 || 'Farm gate hub',
        city: address.district || address.village || 'Nashik',
        state: address.state || 'Maharashtra',
        pincode: address.postalCode || '422003',
        contactPhone: address.phone || '9876543210',
      },
      timeline: this.buildTimeline(serverOrder),
      coldChainTelemetry: {
        currentTempCelsius: 4.2,
        targetTempCelsius: 4.0,
        humidityPercent: 88,
        sensorStatus: 'Optimal',
        batteryLevel: 94,
        lastUpdated: 'Live telemetry active',
      },
    };
  }

  /**
   * Retrieves orders for the authenticated user from GET /api/v1/orders.
   */
  async getOrders(role?: UserRole, userId?: string, status?: OrderStatus | 'all'): Promise<Order[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.set('status', status);
    }

    const queryStr = params.toString();
    const url = queryStr ? `/api/v1/orders?${queryStr}` : '/api/v1/orders';

    const res = await fetch(url, {
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to fetch consignments: ${res.status}`);
    }

    const json = await res.json();
    const serverOrders = json.data || [];
    return serverOrders.map((o: any) => this.adaptServerOrder(o));
  }

  /**
   * Retrieves a single consignment order by ID from GET /api/v1/orders/[id].
   */
  async getOrderById(id: string): Promise<Order | null> {
    const res = await fetch(`/api/v1/orders/${id}`, {
      headers: this.authHeaders(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to load order ${id}: ${res.status}`);
    }

    const json = await res.json();
    return this.adaptServerOrder(json.data);
  }

  /**
   * Executes atomic checkout via POST /api/v1/orders/checkout.
   */
  async checkout(payload: CheckoutInput, idempotencyKey?: string): Promise<Order> {
    const res = await fetch('/api/v1/orders/checkout', {
      method: 'POST',
      headers: this.authHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Checkout failed: ${res.status}`);
    }

    const json = await res.json();
    return this.adaptServerOrder(json.data);
  }

  /**
   * Cancels an existing order and releases reserved stock via POST /api/v1/orders/[id]/cancel.
   */
  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const res = await fetch(`/api/v1/orders/${id}/cancel`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Order cancellation failed: ${res.status}`);
    }

    const json = await res.json();
    return this.adaptServerOrder(json.data);
  }

  /**
   * Legacy interface compatibility method.
   */
  async createOrder(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order> {
    const checkoutPayload: CheckoutInput = {
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      shippingAddress: {
        name: order.buyerName || 'Buyer',
        phone: order.deliveryAddress.contactPhone || '9876543210',
        addressLine1: order.deliveryAddress.street || 'Standard Delivery Point',
        district: order.deliveryAddress.city || 'Nashik',
        state: order.deliveryAddress.state || 'Maharashtra',
        postalCode: order.deliveryAddress.pincode || '422003',
      },
    };

    return this.checkout(checkoutPayload);
  }

  /**
   * Legacy interface compatibility method: updates order status.
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    if (status === 'cancelled') {
      return this.cancelOrder(id, 'Cancelled via order management interface');
    }
    throw new Error(
      `Arbitrary status mutation to '${status}' is not permitted from the client. Transitions must follow canonical order commands.`
    );
  }

  /**
   * Initiates an authoritative Razorpay order via POST /api/v1/payments/create-order.
   */
  async createPaymentOrder(orderId: string): Promise<SafePaymentConfig> {
    const res = await fetch('/api/v1/payments/create-order', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ orderId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Payment initialization failed: ${res.status}`);
    }

    const json = await res.json();
    return json.data.payment;
  }

  /**
   * Verifies Razorpay Checkout signature via POST /api/v1/payments/verify.
   */
  async verifyPayment(payload: VerifyPaymentInput): Promise<{
    orderId: string;
    status: string;
    paymentStatus: string;
    alreadyProcessed: boolean;
  }> {
    const res = await fetch('/api/v1/payments/verify', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Payment verification failed: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  }
}

export const apiOrderService = new ApiOrderService();
