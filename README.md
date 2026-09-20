# Gramora — Smart Agri Marketplace & Cold-Chain Logistics
### Smart India Hackathon 2026 • Problem Statement ID: 26033
> **Problem Statement:** *"Multiple intermediaries reduce farmers' earnings and increase consumer prices."*

---

## 🌾 Project Overview

**Gramora** is a direct agricultural commerce, digital quality grading, and cold-chain logistics platform engineered to eliminate multi-tier intermediary markups (Kachha/Pakka Aadhati commission agents). By connecting smallholder farmers and Farmer Producer Organizations (FPOs) directly with institutional bulk buyers and retail consumers, Gramora delivers transparent price discovery, automated milestone escrow settlements, and dynamic multi-stop pickup routing.

---

## 🏗️ Architecture & Engineering Design

This project adheres strictly to a clean 4-tier frontend layered architecture designed for plug-and-play backend integration:

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                    │
│   (Next.js 14 App Router, Server & Client Components, CSS)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    State & Feature Hooks                    │
│   (useProducts, useOrders, useAuth, useRoutes, useForecast) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Service Contract Interfaces                │
│   (IProductService, IOrderService, IRouteService, etc.)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Data Source Adapters                     │
│    Mock Implementation ──► [Future: Remote Backend / DB]   │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Tenets:
1. **Decoupled Service Abstraction:** UI pages and components consume strongly-typed service interfaces through custom hooks rather than hardcoded mock data. Switching to remote APIs or databases requires zero UI refactoring.
2. **Realistic Domain Modeling:**
   - **Catalog Produce (`Product`):** High-level commodity catalog item with category, variety, images, specifications, and mandi benchmark prices.
   - **Batch Inventory (`ProductLot`):** Physical harvest lot with unique lot number, moisture level, quality grade (`Grade A (Export)`, `Grade A`, `Grade B`, `Organic Certified`), harvest date, storage facility, and reserved escrow stock.
   - **Consignment Lifecycle (`Order` / `OrderItem` / `Delivery`):** Multi-item orders with stage-based timeline tracking and temperature-sensitive transit monitoring.
3. **Role-Based Navigation System:** Centralized configuration (`src/config/navigation.ts`) defines navigational structures for 6 distinct personas:
   - **Farmer** (Listing crops, farm gate sales, storage tracking, price forecasts)
   - **FPO Collective** (Batch aggregation, farmer registry, bulk institutional tenders)
   - **Consumer** (Direct fresh produce procurement, harvest transparency)
   - **Bulk Buyer / Horeca** (Wholesale procurement, contracts, quality certification)
   - **Logistics Partner** (Multi-stop pickup route optimization, reefer temperature telemetry)
   - **National Admin** (Ecosystem monitoring, state-level price surge analytics)

---

## ⚠️ Simulation & Prototype Boundary Disclosures

This repository represents **Phase 1 & Phase 1.5 Frontend Foundation and Architectural Hardening**.

**This platform is currently 100% frontend:**
- **Simulated Telemetry:** Sensor metrics (e.g. Reefer cargo temp: 11.4°C, humidity: 88%) are simulated UI models representing future IoT payload integrations.
- **Simulated Escrow:** Payment statuses and escrow locks are simulated milestone workflows; no real banking or payment gateways are connected.
- **Simulated Route Engine:** Multi-stop pickup visualization on SVG canvas represents algorithmically optimized routes without active GPS tracking.
- **Simulated AI Forecasting:** Price trend confidence intervals and harvest timing recommendations are sample regression curves, not real-time Agmarknet machine learning predictions.
- **Demo Role Switcher & Auth:** The login, registration, and header role-switcher are development demonstration mechanisms and do not represent production authentication or security boundaries.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.17.0 or later
- **npm** or **yarn**

### Installation
```bash
# Clone the repository and navigate to project folder
cd "c:/SIH 2026"

# Install dependencies
npm.cmd install
```

### Development Server
```bash
# Run local development server
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Verification
```bash
# Type check (TypeScript strict mode)
npx.cmd tsc --noEmit

# Lint code with Next.js Core Web Vitals ESLint rules
npm.cmd run lint

# Compile production bundle
npm.cmd run build

# Start production server
npm.cmd run start
```

---

## 📁 Repository Structure

```
c:/SIH 2026
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Login, Register, Forgot Password
│   │   ├── (dashboard)/          # Role-specific operational dashboards
│   │   │   ├── admin/            # Admin mission control & national forecast
│   │   │   ├── buyer/            # Procurement overview & wholesale stats
│   │   │   ├── farmer/           # Harvest listings, inventory, local forecast
│   │   │   ├── logistics/        # Fleet dispatch & route visualization
│   │   │   └── orders/           # Consignment manifests & timeline tracking
│   │   ├── (public)/             # Marketplace catalog & product detail
│   │   ├── about/                # SIH 2026 Problem Statement & Mission (RSC)
│   │   ├── how-it-works/         # 4-stage disintermediation workflow
│   │   └── page.tsx              # Public landing page with live interactive preview
│   ├── components/               # Design system & reusable UI primitives
│   │   ├── data-display/         # DataTable, AppImage, RouteMap, PriceDisplay, etc.
│   │   ├── feedback/             # Toast, EmptyState, Skeletons
│   │   ├── layout/               # AppShell, AppSidebar, Topbar, PublicHeader/Footer
│   │   └── ui/                   # Button, Card, GlassCard, Badge, Dialog, Drawer, Input
│   ├── config/                   # Centralized navigation & role configs
│   ├── hooks/                    # Domain state hooks (useProducts, useOrders, etc.)
│   ├── mocks/                    # Typed mock datasets (isolated behind services)
│   ├── services/                 # Abstract service interfaces & mock implementations
│   └── types/                    # Domain models (Product, ProductLot, Order, User, etc.)
├── tailwind.config.ts            # Custom design tokens, glassmorphism, semantic colors
├── tsconfig.json                 # Strict TypeScript configuration
└── README.md                     # Architectural documentation
```

---

## 🛡️ Future Backend Integration Strategy

When transitioning to full production implementation:
1. Implement `IProductService`, `IOrderService`, `IRouteService`, and `IUserService` against real API endpoints (e.g. Firebase Firestore / Cloud Functions / REST APIs).
2. Wire `useAuth` into real authentication providers (Firebase Auth / Supabase Auth).
3. Connect `RouteMap` to MapLibre / OpenStreetMap / Google Maps SDK.
4. Replace simulated ML curves with live Agmarknet mandi arrivals and ARIMA/LSTM price projection services.
