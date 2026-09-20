import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Store,
  PackageCheck,
  TrendingUp,
  Boxes,
  Truck,
  FileText,
  UserCircle,
  PlusCircle,
  ShieldAlert,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import React from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_CONFIG: Record<UserRole, NavSection[]> = {
  farmer: [
    {
      title: 'Operations',
      items: [
        { title: 'Farmer Dashboard', href: '/farmer/dashboard', icon: LayoutDashboard },
        { title: 'My Crops & Listings', href: '/farmer/products', icon: Boxes },
        { title: 'List New Harvest', href: '/farmer/products/new', icon: PlusCircle },
        { title: 'Cold Storage & Inventory', href: '/farmer/inventory', icon: PackageCheck },
      ],
    },
    {
      title: 'Market Intelligence',
      items: [
        { title: 'Price & Demand Forecast', href: '/farmer/forecast', icon: TrendingUp, badge: 'AI' },
        { title: 'Farm Orders', href: '/orders', icon: FileText },
        { title: 'Live Marketplace', href: '/marketplace', icon: Store },
      ],
    },
    {
      title: 'Settings',
      items: [
        { title: 'Kisan Profile & Land', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  fpo: [
    {
      title: 'Collective Hub',
      items: [
        { title: 'FPO Dashboard', href: '/farmer/dashboard', icon: LayoutDashboard },
        { title: 'Aggregated Listings', href: '/farmer/products', icon: Boxes },
        { title: 'Batch Inventory', href: '/farmer/inventory', icon: PackageCheck },
      ],
    },
    {
      title: 'Trade & Logistics',
      items: [
        { title: 'Commodity Forecast', href: '/farmer/forecast', icon: TrendingUp, badge: 'AI' },
        { title: 'Bulk Orders', href: '/orders', icon: FileText },
        { title: 'Marketplace', href: '/marketplace', icon: Store },
      ],
    },
    {
      title: 'Settings',
      items: [
        { title: 'FPO Registry Profile', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  consumer: [
    {
      title: 'Shopping',
      items: [
        { title: 'Buyer Dashboard', href: '/buyer/dashboard', icon: LayoutDashboard },
        { title: 'Direct Farm Marketplace', href: '/marketplace', icon: Store },
        { title: 'My Orders & Freshness', href: '/orders', icon: FileText },
      ],
    },
    {
      title: 'Account',
      items: [
        { title: 'Profile & Addresses', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  buyer: [
    {
      title: 'Procurement',
      items: [
        { title: 'Procurement Overview', href: '/buyer/dashboard', icon: LayoutDashboard },
        { title: 'Wholesale Marketplace', href: '/marketplace', icon: Store },
        { title: 'Bulk Contracts & Orders', href: '/orders', icon: FileText },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { title: 'Price Trends & Forecast', href: '/farmer/forecast', icon: TrendingUp, badge: 'AI' },
      ],
    },
    {
      title: 'Enterprise',
      items: [
        { title: 'Corporate Profile & GST', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  bulk_buyer: [
    {
      title: 'Procurement',
      items: [
        { title: 'Procurement Overview', href: '/buyer/dashboard', icon: LayoutDashboard },
        { title: 'Wholesale Marketplace', href: '/marketplace', icon: Store },
        { title: 'Bulk Contracts & Orders', href: '/orders', icon: FileText },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { title: 'Price Trends & Forecast', href: '/farmer/forecast', icon: TrendingUp, badge: 'AI' },
      ],
    },
    {
      title: 'Enterprise',
      items: [
        { title: 'Corporate Profile & GST', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  logistics: [
    {
      title: 'Fleet Operations',
      items: [
        { title: 'Logistics Dashboard', href: '/logistics/dashboard', icon: LayoutDashboard },
        { title: 'Route Optimization', href: '/logistics/routes', icon: Truck, badge: 'Smart' },
        { title: 'Consignments & Waybills', href: '/orders', icon: FileText },
      ],
    },
    {
      title: 'Fleet Management',
      items: [
        { title: 'Vehicle Fleet Profile', href: '/profile', icon: UserCircle },
      ],
    },
  ],

  admin: [
    {
      title: 'National Mission Control',
      items: [
        { title: 'Ecosystem Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { title: 'National Demand Forecast', href: '/admin/forecast', icon: BarChart3, badge: 'National' },
        { title: 'All Dispatched Orders', href: '/orders', icon: FileText },
        { title: 'Produce Marketplace', href: '/marketplace', icon: Store },
      ],
    },
    {
      title: 'Administration',
      items: [
        { title: 'Admin Registry', href: '/profile', icon: ShieldAlert },
      ],
    },
  ],
};
