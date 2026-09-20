export * from './interfaces';
export * from './auth';
export * from './api';

import {
  mockProductService,
  mockUserService,
  orderService as mockOrderService,
  forecastService,
  routeService,
  notificationService,
} from './mock';
import { apiProductService } from './api/product.service';
import { apiUserService } from './api/user.service';
import { apiOrderService } from './api/order.service';
import { IProductService, IUserService, IOrderService } from './interfaces';

/**
 * Authoritative Application Service Routing.
 * Defaults to live API-backed services.
 * Mock services are only engaged if NEXT_PUBLIC_USE_MOCK_SERVICES is explicitly 'true'.
 */
const isMockExplicitlyRequested = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'true';

export const productService: IProductService = isMockExplicitlyRequested
  ? mockProductService
  : apiProductService;

export const userService: IUserService = isMockExplicitlyRequested
  ? mockUserService
  : apiUserService;

export const orderService: IOrderService = isMockExplicitlyRequested
  ? mockOrderService
  : apiOrderService;

export { forecastService, routeService, notificationService };

