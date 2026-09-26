# StockSense 📦

> **Next-Generation Modular Inventory Management System (IMS)**  
> *Real-time, double-entry stock tracking, seamless operations workflow, and tamper-proof ledger auditing for modern logistics.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express-5-green.svg)](https://expressjs.com/)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-orange.svg)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2FSupabase-336791.svg)](https://www.postgresql.org/)
[![Swagger Docs](https://img.shields.io/badge/API_Docs-Swagger%2FOpenAPI-85EA2D.svg)](http://localhost:3000/api-docs)

---

## 📌 Executive Summary

**StockSense** is an enterprise-grade, lightweight Inventory Management System designed to bridge the gap between high-level inventory planning and high-velocity warehouse floor execution. Inspired by Odoo’s double-entry stock architecture, StockSense replaces fragmented spreadsheets, error-prone paper logs, and sluggish legacy ERPs with an atomic, transactional, and audit-backed platform.

Whether handling bulk vendor receipts at an inbound dock, picking orders for outbound delivery, transferring materials across internal warehouse racks, or reconciling physical stock counts, StockSense guarantees complete traceability and zero phantom stock.

---

## 🎯 The Problem Statement

### 1. The Chaos of Manual Registers & Disconnected Spreadsheets
According to industry studies, over 40% of small-to-medium businesses and growing warehouses rely on manual paper logs or fragmented spreadsheets (Excel, Google Sheets). As inventory scales across multiple bays, racks, and warehouses:
- **Concurrent edits create data drift**: Multiple team members updating sheets independently results in conflicting stock counts.
- **Transcription & human calculation errors**: Fat-finger mistakes during physical counts or receipts compound over time.
- **Zero traceability**: Spreadsheets show *what* the number is today, but completely obscure *who* modified it, *when*, *why*, and from *which location*.

### 2. The "Black Box Inventory" & Phantom Stock
In conventional simple CRUD inventory apps, stock is stored as a single mutable integer (`UPDATE products SET stock = stock + 10`). This creates fatal blind spots:
- Items disappear or appear without provenance.
- Inability to conduct forensic audits when discrepancies arise.
- No historical record of vendor delivery variances or internal shrinkage.

### 3. The Enterprise ERP Dilemma (Bloat vs. Speed)
Legacy monoliths like SAP, Oracle, and NetSuite solve traceability, but introduce severe drawbacks:
- **Cost & Complexity**: Prohibitive licensing, multi-month deployment cycles, and steep training curves.
- **Sluggish Warehouse Floor Experience**: Clunky desktop-first UIs filled with hundreds of mandatory non-operational fields that floor workers actively avoid or bypass.

### 4. Stockouts vs. Dead Capital Trap
Without real-time visibility into pending receipts, active reservations, and automated reorder points:
- Companies run out of high-demand items, resulting in lost revenue and broken customer SLAs.
- Alternatively, teams over-purchase safety stock, locking up working capital in depreciating or dead inventory.

---

## 💡 Why StockSense is Unique

StockSense was engineered from the ground up to synthesize the rigor of enterprise accounting with the speed of a modern web application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STOCKSENSE UNIQUENESS MATRIX                     │
├──────────────────────┬──────────────────────┬───────────────┬───────────────┤
│ Capability           │ Manual / Spreadsheets│ Legacy ERPs   │ StockSense    │
├──────────────────────┼──────────────────────┼───────────────┼───────────────┤
│ Traceability         │ ❌ Zero               │ ⚠️ High Lag   │ ✅ Real-time  │
│ Cost & Agility       │ ✅ Free / Messy      │ ❌ Heavy $$$  │ ✅ Lean / Fast│
│ Double-Entry Ledger  │ ❌ None              │ ⚠️ Complex    │ ✅ Built-in   │
│ Floor Usability      │ ⚠️ Fragile           │ ❌ Sluggish   │ ✅ Instant UI │
│ Audit Trail          │ ❌ Lost Edits        │ ⚠️ Buried Logs│ ✅ Immutable  │
│ Variance Adjustments │ ❌ Manual Math       │ ⚠️ Multi-Step │ ✅ Live Diff  │
└──────────────────────┴──────────────────────┴───────────────┴───────────────┘
```

### 1. Double-Entry Inventory Ledger (Invariant Stock Mathematics)
StockSense implements the **Double-Entry Principle**: *Goods never magically appear or disappear.* Every stock mutation is treated as a balanced movement from a **Source Location** to a **Destination Location**:
- **Receipts**: `Supplier (Virtual)` ➔ `Warehouse Bay (Physical)` *(Inbound +)*
- **Deliveries**: `Warehouse Bay (Physical)` ➔ `Customer (Virtual)` *(Outbound -)*
- **Internal Transfers**: `Main Warehouse / Shelf A` ➔ `Production Rack / Shelf B` *(Location Rebalancing)*
- **Inventory Adjustments**: `Warehouse Location` ⇄ `Virtual Loss/Gain Location` *(Audit Reconciliation)*

### 2. Unified 4-Pillar Operations State Machine
Instead of maintaining fragmented sub-modules with incompatible data models, StockSense harmonizes all inventory operations (**Receipts**, **Deliveries**, **Internal Transfers**, and **Adjustments**) under a single atomic state machine:
$$\text{Draft} \longrightarrow \text{Waiting} \longrightarrow \text{Ready} \longrightarrow \text{Done} \quad (\text{or } \text{Cancelled})$$
- Deterministic, zero-collision sequential references (`REC-000001`, `DEL-000001`, `INT-000001`, `ADJ-000001`).
- Atomic transactions in PostgreSQL prevent partial stock updates if validation fails midway.

### 3. Immutable Forensic Audit Trail (`stock_moves`)
When an operation reaches `done`, an unalterable log is permanently sealed in the `stock_moves` ledger. Each record captures:
- Exact Product ID & SKU
- Origin Location and Target Location
- Quantity moved (always positive, direction dictated by locations)
- Authorizing User ID & timestamp
- Operational context and audit reason (e.g., "Vendor PO-990", "Damaged transit", "Physical count surplus")

### 4. Interactive Physical-to-Ledger Reconciliation Engine
Physical counting is typically prone to calculation mistakes. StockSense features an **interactive live variance calculator**:
- Select an audit location (e.g., `WH/Stock1`).
- Input the physical count.
- The system dynamically computes the variance (`Counted - Recorded`), displaying real-time surplus (`+`) or shortage (`-`) indicators before committing.
- On validation, the database atomically resets the stock level and writes the exact delta into the audit ledger.

### 5. Proactive Reorder Intelligence & Negative-Stock Prevention
- Configurable **Minimum Reorder Points** (`reorder_point`) and **Suggested Reorder Quantities** (`reorder_qty`).
- High-contrast visual warnings trigger when on-hand stock drops below critical safety levels.
- Outbound delivery validations strictly verify available inventory per location, preventing negative stock states before transactions can commit.

### 6. Modern, Blazing-Fast Full-Stack Ergonomics
- **React 19 + Vite + TypeScript**: Instant client-side page transitions, zero enterprise lag.
- **Drizzle ORM & PostgreSQL**: Strict type-safety from schema to API, eliminating runtime SQL surprises.
- **Geist Design System & Odoo-Inspired Aesthetic**: High-density clean layout optimized for rapid data entry, keyboard shortcuts, and warehouse tablet devices.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Client (React 19 + Vite)"]
        UI[Geist UI / Tailwind Minimal]
        Zustand[Zustand State Store]
        TQuery[TanStack React Query]
    end

    subgraph API ["Backend API (Express 5 + TypeScript)"]
        Router[API Router /api/v1]
        AuthMid[JWT & RBAC Middleware]
        ZodVal[Zod Validation Schemas]
        OpEngine[Operations & Ledger Engine]
        Swagger[OpenAPI / Swagger UI]
    end

    subgraph Data ["Data Persistence Layer"]
        Drizzle[Drizzle ORM]
        PG[(PostgreSQL / Supabase)]
    end

    UI -->|HTTP / REST| Router
    Router --> AuthMid
    AuthMid --> ZodVal
    ZodVal --> OpEngine
    OpEngine --> Drizzle
    Drizzle --> PG
    Swagger -.->|Interactive Docs| Router
```

---

## 🔄 Core Operational Lifecycles

### Inbound, Outbound & Transfer Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Warehouse Specialist
    participant Ops as Operations Service
    participant DB as PostgreSQL Transaction
    participant Ledger as Stock Moves Ledger

    Note over Staff,Ledger: 1. Inbound Receipt
    Staff->>Ops: Validate Receipt (REC-000001)
    Ops->>DB: Increment Stock in Dest Location (WH/Stock)
    Ops->>Ledger: Insert Move (Supplier -> WH/Stock, MoveType: IN)
    DB-->>Staff: Stock Updated & Receipt Marked 'Done'

    Note over Staff,Ledger: 2. Internal Transfer
    Staff->>Ops: Validate Transfer (INT-000001)
    Ops->>DB: Decrement Source (WH/Stock) & Increment Dest (WH/RackB)
    Ops->>Ledger: Insert Move (WH/Stock -> WH/RackB, MoveType: TRANSFER)
    DB-->>Staff: Location Rebalanced

    Note over Staff,Ledger: 3. Outbound Delivery Order
    Staff->>Ops: Validate Delivery (DEL-000001)
    Ops->>DB: Check Availability >= Demand
    Ops->>DB: Decrement Stock in Source Location (WH/Stock)
    Ops->>Ledger: Insert Move (WH/Stock -> Customer, MoveType: OUT)
    DB-->>Staff: Delivery Order Completed
```

---

## 👥 Target Personas & Use Cases

| Persona | Core Responsibilities | StockSense Superpowers |
| :--- | :--- | :--- |
| **Inventory Manager** | Catalog governance, warehouse capacity planning, reorder thresholds, audit oversight. | Live KPI summary cards, low-stock threshold triggers, multi-warehouse hierarchy views, forensic ledger inspection. |
| **Warehouse Specialist** | Physical goods intake, put-away, cross-docking, order picking, cycle counts. | Fast single-click validation, real-time location stock availability, clear visual out-of-stock badges, error prevention guards. |

---

## 🗄️ Database Domain Model

StockSense organizes its data into strict relational domains using [Drizzle ORM](file:///c:/Users/Mawiya/Desktop/stocksense/Template_Hack/backend/src/db/schema/index.ts):

| Domain Table | Description | Key Attributes |
| :--- | :--- | :--- |
| `users` | Role-based accounts (`manager`, `staff`). | `id`, `name`, `email`, `role`, `password_hash`, `is_active` |
| `warehouses` | Physical storage sites and distribution centers. | `id`, `name`, `address`, `is_active` |
| `locations` | Granular zones (`internal`, `customer`, `supplier`, `adjustment`). | `id`, `warehouse_id`, `name`, `type` |
| `categories` | Product classification taxonomy. | `id`, `name`, `description` |
| `products` | Core catalog with units and replenishment limits. | `id`, `name`, `sku`, `category_id`, `unit_of_measure`, `reorder_point`, `reorder_qty` |
| `stock_levels` | Current on-hand quantity per product and location. | `id`, `product_id`, `location_id`, `quantity` |
| `operations` | Transactional master record for 4 movement types. | `id`, `reference`, `type`, `status`, `source_location_id`, `dest_location_id`, `partner_name` |
| `operation_lines` | Itemized line items within an operation. | `id`, `operation_id`, `product_id`, `quantity`, `quantity_done` |
| `stock_moves` | Permanent, immutable ledger entries. | `id`, `operation_id`, `product_id`, `from_location_id`, `to_location_id`, `quantity`, `move_type`, `reason` |
| `otp_codes` | Secure one-time passwords for password recovery. | `id`, `user_id`, `code`, `expires_at`, `used` |

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19, TypeScript, Vite
  - React Router 7 (Data router & layouts)
  - TanStack React Query v5 (Server state caching & invalidation)
  - Zustand (Client UI & session state)
  - Recharts (Analytics & stock distribution charts)
  - Geist Sans & Geist Mono Typography
- **Backend**:
  - Node.js & Express 5 (High throughput REST API)
  - TypeScript & `tsx` runtime
  - Drizzle ORM (Type-safe SQL queries & schema migrations)
  - PostgreSQL / Supabase
  - Zod & `@asteasolutions/zod-to-openapi`
  - Swagger UI Express (Interactive API testing at `/api-docs`)
  - Pino & Pino-HTTP (Structured JSON logging)
  - Resend (Email & OTP notifications)

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [PostgreSQL](https://www.postgresql.org/) database or [Supabase](https://supabase.com/) instance
- [Git](https://git-scm.com/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Syed-Tashfeen/odoo-x-lpu-hackathon-2026.git
cd odoo-x-lpu-hackathon-2026

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hackathon_db
JWT_ACCESS_SECRET=super_secret_access_jwt_key_at_least_10_chars
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_at_least_10_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=
EMAIL_FROM="StockSense <onboarding@resend.dev>"
```

### 3. Database Migration & Seeding

From the `backend/` directory:

```bash
# Push the Drizzle schema to PostgreSQL
npm run db:push

# Seed default warehouses, locations, categories, products, operations, and test accounts
npm run db:seed
```

### 4. Run Development Servers

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
# Swagger API Docs available at http://localhost:3000/api-docs
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Client runs on http://localhost:5173
```

---

## 🔑 Default Seed Credentials

After running `npm run db:seed`, the system provides pre-configured accounts:

| Role | Email | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **Manager** | `admin@stocksense.com` | `admin123` | Full access: CRUD operations, warehouses, products, reordering rules, validation |
| **Staff** | `staff@stocksense.com` | `staff123` | Operational access: receipts, transfers, deliveries, adjustments |

---

## 📡 Key API Endpoints

All endpoints are documented interactively in Swagger at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user & return JWT tokens |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | Verify OTP & set new password |
| `GET` | `/api/v1/dashboard/metrics` | Real-time KPIs: stock count, low stock, pending receipts/deliveries |
| `GET` | `/api/v1/products` | Paginated product list with category & location stock |
| `POST` | `/api/v1/products` | Create product with SKU & reorder thresholds |
| `GET` | `/api/v1/operations` | List operations filtered by `type` and `status` |
| `POST` | `/api/v1/operations` | Create new draft operation (`receipt`, `delivery`, `internal`, `adjustment`) |
| `POST` | `/api/v1/operations/:id/validate` | **Core Engine**: Execute atomic stock mutations & write to ledger |
| `POST` | `/api/v1/operations/:id/cancel` | Cancel draft/waiting operation |
| `GET` | `/api/v1/stock/moves` | Retrieve full immutable move history ledger |
| `GET` | `/api/v1/warehouses` | View multi-warehouse network and child locations |

---

## 📂 Project Directory Structure

```
odoo-x-lpu-hackathon-2026/
├── README.md                         # Project documentation and specifications
├── StockSense.md                     # Hackathon problem statement specification
├── plan.md                           # Comprehensive architecture and milestone roadmap
├── docker-compose.yml                # Docker compose orchestration
├── backend/
│   ├── src/
│   │   ├── config/                   # Database client, env loader, Swagger setup
│   │   ├── db/
│   │   │   ├── schema/               # Drizzle schemas (users, products, operations, etc.)
│   │   │   ├── seed.ts               # Database seeder with realistic test data
│   │   │   └── migrate.ts            # Migration runner
│   │   ├── middleware/               # Auth (JWT), validation (Zod), and error handlers
│   │   ├── modules/
│   │   │   ├── auth/                 # Authentication, JWT, and OTP password reset
│   │   │   ├── categories/           # Product categories
│   │   │   ├── dashboard/            # High-level KPIs and operational analytics
│   │   │   ├── operations/           # Receipts, Deliveries, Transfers, Adjustments
│   │   │   ├── products/             # Catalog, SKUs, and reordering rules
│   │   │   ├── stock/                # Stock level queries and move history ledger
│   │   │   └── warehouses/           # Warehouses and internal/virtual locations
│   │   ├── app.ts                    # Express application configuration
│   │   └── index.ts                  # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/               # UI components (Sidebar, TopBar, KPI Cards, Modal)
│   │   ├── features/
│   │   │   ├── auth/                 # Login, Registration, OTP Password Reset
│   │   │   ├── dashboard/            # KPI charts, operational statuses, fast shortcuts
│   │   │   ├── operations/           # Unified Receipts, Deliveries, Transfers & Adjustments
│   │   │   ├── products/             # Product list, modal creation, location stock breakdown
│   │   │   ├── move-history/         # Immutable stock ledger audit explorer
│   │   │   └── settings/             # Warehouse and location configurations
│   │   ├── stores/                   # Zustand stores for client-side state
│   │   ├── styles/                   # Geist styling and design system
│   │   ├── App.tsx                   # Root component
│   │   └── main.tsx                  # React entry point
│   └── package.json
```

---

## 🏆 Hackathon Context

This project was built for the **Odoo x LPU Hackathon 2026** to showcase how modern software engineering and double-entry accounting principles can revolutionize traditional inventory management.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
