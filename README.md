# Sabzi Mandi — Classic Arhti UI

## MongoDB Atlas

Edit `backend/.env` and set a working `MONGODB_URI`, then allow your IP in Atlas → Network Access.

## Run

```bash
# Backend
cd backend
npm install
npm run seed   # first time — owner + sample masters
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API health: http://localhost:5001/api/v1/health  
- Login: `owner@shop.com` / `1234`

## Domain (dynamic)

```
Party (customer/trader/supplier) ──┬── LedgerEntry
Product (جنس)                      │
Marfat (معرفت + زمیندار) ──────────┤
SaleBill + lines + charges ────────┤ posts ledger
PurchaseBill + lines + charges ────┤
CustomerPurchase ──────────────────┤
Voucher (بنام/جمع/وصولی) ──────────┘
```

### API (`/api/v1`)

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/login`, `/register`, `GET /auth/me` |
| Parties | CRUD + `GET /parties/next-code` |
| Products | CRUD + next-code |
| Marfat | CRUD + next-code |
| Sales / Purchases / Customer-purchases | list, create, update, delete, next-invoice |
| Vouchers | list, create, delete (بنام/جمع/وصولی) |
| Ledger | list, party ledger, summary |

Frontend proxies `/api` → `localhost:5001`. Masters, bills, payments, party ledger are API-backed.

## UI

Classic Mandi home with dual sidebars, Urdu/English, and commission-shop workflows.
