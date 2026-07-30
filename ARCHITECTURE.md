# Sabzi Mandi — Arhti & Commission Shop Management System

Production architecture for a multi-tenant vegetable/fruit commission shop (Pakistan).

Money is stored as **integer paisa** (1 PKR = 100 paisa). Never use floating-point for money.

---

## 1. Complete Folder Structure

```
Sabzi Mandi/
├── ARCHITECTURE.md
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── db.ts
│   │   │   └── roles.ts
│   │   ├── models/
│   │   │   ├── Business.ts
│   │   │   ├── User.ts
│   │   │   ├── RefreshToken.ts
│   │   │   ├── Party.ts
│   │   │   ├── Product.ts
│   │   │   ├── Unit.ts
│   │   │   ├── Purchase.ts
│   │   │   ├── Sale.ts
│   │   │   ├── LedgerEntry.ts
│   │   │   ├── Payment.ts
│   │   │   ├── StockMovement.ts
│   │   │   ├── Expense.ts
│   │   │   ├── ExpenseCategory.ts
│   │   │   ├── CashBookEntry.ts
│   │   │   ├── DailyClosing.ts
│   │   │   ├── Sequence.ts
│   │   │   └── AuditLog.ts
│   │   ├── validators/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── party.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── purchase.service.ts
│   │   │   ├── sale.service.ts
│   │   │   ├── ledger.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── cashbook.service.ts
│   │   │   ├── report.service.ts
│   │   │   └── pdf.service.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── authorize.ts
│   │   │   ├── tenant.ts
│   │   │   ├── validate.ts
│   │   │   ├── audit.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── errorHandler.ts
│   │   ├── utils/
│   │   │   ├── money.ts
│   │   │   ├── ApiError.ts
│   │   │   ├── ApiResponse.ts
│   │   │   ├── asyncHandler.ts
│   │   │   ├── pagination.ts
│   │   │   └── tokens.ts
│   │   ├── types/
│   │   └── seeds/
│   │       └── seed.ts
│   └── uploads/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── components.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── assets/
│       ├── components/
│       │   ├── ui/              # shadcn
│       │   ├── forms/
│       │   ├── tables/
│       │   ├── modals/
│       │   ├── print/
│       │   ├── layout/
│       │   └── shared/
│       ├── features/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── parties/
│       │   ├── products/
│       │   ├── units/
│       │   ├── purchases/
│       │   ├── sales/
│       │   ├── ledger/
│       │   ├── payments/
│       │   ├── inventory/
│       │   ├── cashbook/
│       │   ├── expenses/
│       │   ├── reports/
│       │   └── settings/
│       ├── store/
│       │   ├── index.ts
│       │   ├── api/
│       │   │   └── baseApi.ts
│       │   └── slices/
│       ├── hooks/
│       ├── lib/
│       │   ├── money.ts
│       │   ├── utils.ts
│       │   └── permissions.ts
│       ├── i18n/
│       │   ├── index.ts
│       │   ├── en.json
│       │   └── ur.json
│       ├── routes/
│       └── types/
```

---

## 2. Database Schema Relationships

```
Business (tenant root)
  ├── User[]                    businessId
  ├── Unit[]                    businessId
  ├── Product[]                 businessId, baseUnitId → Unit
  ├── Party[]                   businessId (type: customer|supplier|agent|transporter|labour)
  ├── Purchase[]                businessId, supplierId → Party
  │     └── PurchaseItem[]      productId → Product
  ├── Sale[]                    businessId, customerId → Party
  │     └── SaleItem[]          productId → Product
  ├── LedgerEntry[]             businessId, partyId → Party (IMMUTABLE)
  ├── Payment[]                 businessId, partyId → Party
  ├── StockMovement[]           businessId, productId → Product
  ├── ExpenseCategory[]         businessId
  ├── Expense[]                 businessId, categoryId
  ├── CashBookEntry[]           businessId
  ├── DailyClosing[]            businessId + date (unique)
  ├── Sequence[]                businessId + key (invoice counters)
  └── AuditLog[]                businessId, userId

Multi-tenant rule: EVERY business document includes businessId.
Queries always scoped by req.user.businessId (except platform super-admin if added later).
```

### Core field conventions

| Concern | Approach |
|--------|----------|
| Money | `Number` integer paisa (never float) |
| Soft delete | `isDeleted`, `deletedAt`, `deletedBy` |
| Audit | separate `AuditLog` collection |
| Ledger | append-only; cancel via reversing entry |
| Stock | `Product.stockInBaseUnit` + `StockMovement` history |
| Opening balance | Party.openingBalancePaisa + opening LedgerEntry |

---

## 3. API Endpoint List

Base: `/api/v1`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register-business` | Owner signup + create business |
| POST | `/auth/login` | Login (access + refresh cookie) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current user + permissions |
| POST | `/auth/change-password` | Change password |

### Business / Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/business` | Get current business |
| PATCH | `/business` | Update shop settings |
| GET | `/business/users` | List users |
| POST | `/business/users` | Invite/create user |
| PATCH | `/business/users/:id` | Update role/status |
| DELETE | `/business/users/:id` | Soft-deactivate user |

### Units
| Method | Path | Description |
|--------|------|-------------|
| GET | `/units` | List units |
| POST | `/units` | Create unit |
| PATCH | `/units/:id` | Update unit |
| DELETE | `/units/:id` | Soft delete |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List (search, sort, paginate) |
| GET | `/products/:id` | Detail |
| POST | `/products` | Create |
| PATCH | `/products/:id` | Update |
| DELETE | `/products/:id` | Soft delete |
| GET | `/products/:id/stock` | Stock + movements summary |

### Parties
| Method | Path | Description |
|--------|------|-------------|
| GET | `/parties` | List by type/search |
| GET | `/parties/:id` | Detail |
| POST | `/parties` | Create (+ opening balance ledger) |
| PATCH | `/parties/:id` | Update (not opening once set locked) |
| DELETE | `/parties/:id` | Soft delete |
| GET | `/parties/:id/ledger` | Ledger statement |
| GET | `/parties/:id/balance` | Current outstanding |

### Purchases / Sales / Payments / Inventory / Cash / Reports
*(Implemented in later milestones — see section 7)*

| Area | Prefix |
|------|--------|
| Purchases | `/purchases` |
| Sales | `/sales` |
| Payments | `/payments` |
| Inventory | `/inventory` |
| Cash book | `/cashbook` |
| Expenses | `/expenses` |
| Dashboard | `/dashboard` |
| Reports | `/reports` |
| Audit | `/audit-logs` |

---

## 4. Authentication & Permission Flow

```
Login → bcrypt verify
  → issue access JWT (15m) + refresh JWT (7d, httpOnly secure cookie)
  → store refresh token hash in RefreshToken collection
  → write AuditLog(action=login)

Request → Helmet/CORS/rate-limit
  → authenticate JWT → attach user + businessId
  → authorize(permission) from role map
  → tenant scope (businessId filter)
  → handler
```

### Roles → Permissions

| Permission | Owner | Admin | Accountant | Salesman | Viewer |
|------------|:-----:|:-----:|:----------:|:--------:|:------:|
| settings.manage | ✓ | ✓ | | | |
| users.manage | ✓ | ✓ | | | |
| parties.read/write | ✓ | ✓ | ✓ | ✓ read | ✓ read |
| products.read/write | ✓ | ✓ | ✓ | ✓ read | ✓ read |
| purchases.* | ✓ | ✓ | ✓ | | |
| sales.create/confirm | ✓ | ✓ | ✓ | ✓ | |
| sales.cancel | ✓ | ✓ | ✓ | | |
| payments.* | ✓ | ✓ | ✓ | limited | |
| ledger.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory.adjust | ✓ | ✓ | ✓ | | |
| cashbook.* | ✓ | ✓ | ✓ | | |
| expenses.* | ✓ | ✓ | ✓ | | |
| reports.* | ✓ | ✓ | ✓ | limited | ✓ |
| dashboard.read | ✓ | ✓ | ✓ | ✓ | ✓ |

Owner has all permissions. Viewer is read-only.

---

## 5. Invoice Calculation Rules

All money in **paisa**. Weights converted to **base unit (KG)** via Unit.factorToBase.

### Sale line item
```
lineAmount = round(ratePaisaPerUnit × quantity)
  OR when billed by weight:
lineAmount = round(ratePaisaPerKg × netWeightKg)
```

### Sale totals
```
itemsSubtotal   = Σ lineAmount
charges         = labour + loading + transport + commission + marketFee + other
grossTotal      = itemsSubtotal + charges
netPayable      = max(0, grossTotal − discount)
paidAmount      = cash/bank/wallet portion on confirm
creditAmount    = netPayable − paidAmount
previousBalance = party outstanding before this invoice
closingBalance  = previousBalance + creditAmount
                (or previousBalance − overpay if paid > net)
```

### Purchase totals
```
itemCost        = rate × netWeight (or qty)
charges         = labour + freight + commission + marketCharges
billTotal       = Σ itemCost + charges
paidAmount / outstandingAmount as entered
stockIn         = netWeightKg (gross − bardana) converted to base
```

### Rounding
- Intermediate: integer paisa only
- Half-up on last paisa when converting from rate × qty if needed via Money.round()

### Stock gate (sale confirm)
```
FOR EACH item:
  requiredBase = convert(qty/weight → base)
  IF product.stockInBaseUnit < requiredBase → reject (409)
```

---

## 6. Ledger Accounting Rules

### Conventions (party perspective)
- **Debit** increases what party owes us (customer sale credit) OR increases what we paid them without goods (supplier payment).
- **Credit** decreases party payable to us (customer payment) OR increases what we owe them (supplier purchase).

Practical Mandi mapping:

| Event | Party type | Debit | Credit |
|-------|------------|-------|--------|
| Opening receivable | Customer | opening | 0 |
| Opening payable | Supplier | 0 | opening |
| Sale (credit portion) | Customer | net − paid | 0 |
| Customer payment | Customer | 0 | paid |
| Purchase (outstanding) | Supplier | 0 | outstanding |
| Supplier payment | Supplier | paid | 0 |
| Sale cancel | Customer | 0 | reverse original debit |
| Purchase cancel | Supplier | reverse | 0 |

### Immutability
1. Confirmed documents never mutate ledger rows.
2. Cancel creates **reversal** LedgerEntry linked via `reversesEntryId` / `reversedByEntryId`.
3. Running balance = opening + Σ(debit − credit) in date order (recomputed on read or via cached `Party.balancePaisa` updated in same transaction).

### Atomic confirm (MongoDB session)
```
session.withTransaction:
  1. Validate stock / party / draft status
  2. Update Sale/Purchase status → confirmed
  3. Create LedgerEntry(+es)
  4. Create Payment + CashBookEntry if cash/bank
  5. Create StockMovement(s); update Product.stock
  6. Update Party.balancePaisa
  7. AuditLog
```

---

## 7. Development Milestones

| # | Milestone | Deliverables |
|---|-----------|--------------|
| **M1** | Foundation | Auth, business settings, units, products, parties, audit, i18n shell, layout |
| **M2** | Purchases & Inventory | Purchase CRUD/confirm, stock in, movements, returns/wastage stubs |
| **M3** | Sales & Print | Sale invoice, stock out, A4/thermal, PDFKit bilingual |
| **M4** | Ledger & Payments | Party ledger PDF, receipts, payment methods |
| **M5** | Cash & Expenses | Cash book, daily closing lock, expense categories |
| **M6** | Dashboard & Reports | KPIs, charts, Excel/PDF exports |
| **M7** | Hardening | E2E tests, backups docs, perf indexes, production deploy |

**Current focus: Milestone M1**
)
