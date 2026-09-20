import { Notification } from '@/types';

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'New Bulk Order Dispatched',
    message: 'Reefer Truck MH-15-EG-4921 has departed Dindori with your 1,200kg Red Onion allocation.',
    type: 'order',
    read: false,
    createdAt: '2026-03-19T06:50:00Z',
    actionUrl: '/orders/ord-101',
  },
  {
    id: 'notif-2',
    title: 'High Demand Surge Alert: Red Onions',
    message: 'Wholesale mandi arrival shortage detected in northern zones. Anticipated +28% price rise in 30 days.',
    type: 'forecast',
    read: false,
    createdAt: '2026-03-19T05:00:00Z',
    actionUrl: '/farmer/forecast',
  },
  {
    id: 'notif-3',
    title: 'Cold Storage Low Stock Warning',
    message: 'English Cucumber lot in Sahyadri Reefer Facility C has dropped below minimum threshold (150kg remaining).',
    type: 'inventory',
    read: true,
    createdAt: '2026-03-18T16:20:00Z',
    actionUrl: '/farmer/inventory',
  },
  {
    id: 'notif-4',
    title: 'Route Stop Verified via Digital Inspection',
    message: 'Stop 2 (Pimpalgaon Farmer Collection Center) completed with 0 temperature excursions.',
    type: 'route',
    read: true,
    createdAt: '2026-03-18T09:10:00Z',
    actionUrl: '/logistics/routes',
  },
];
