# Sabzi Mandi — Arhti & Commission Shop Management

Production-oriented MERN system for Pakistani sabzi mandi commission shops.

Full architecture (folder structure, schemas, APIs, auth, invoice/ledger rules, milestones): see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Milestone 1 (implemented)

- JWT access + refresh (httpOnly cookie) authentication
- Roles: Owner, Admin, Accountant, Salesman, Viewer
- Business settings
- Shared Party model (customer / supplier / agent / transporter / labour)
- Units with KG conversion (seeded on register)
- Products (EN/UR names, rates in paisa, stock)
- Multi-tenant `businessId` scoping
- Soft deletes, audit logs, money as integer paisa
- React + Vite + TS + Tailwind + RTK Query + i18n (Urdu RTL + English)

## Quick start

### Prerequisites

- Node.js 20+
- MongoDB 6+ (`mongodb://127.0.0.1:27017`)
- For invoice confirm transactions in later milestones: MongoDB replica set

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: `http://localhost:5001/api/v1/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

1. Register a shop
2. Login
3. Manage parties, products, units, settings

## Money

All amounts are stored as **integer paisa** (1 PKR = 100 paisa). UI accepts PKR and converts.

## Next milestones

- M2 Purchases & inventory
- M3 Sales invoices + PDF print
- M4 Ledger & payments
- M5 Cash book & expenses
- M6 Dashboard charts & reports
- M7 Hardening & deploy
