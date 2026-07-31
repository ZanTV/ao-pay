# AO PAY

**Create Payment Links. Get Paid Anywhere.**

Enterprise-grade payment platform for generating secure payment links, collecting payments through multiple gateways, and managing transactions.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, ShadCN UI, Framer Motion
- **Backend:** Node.js, Express, TypeScript, Prisma
- **Database:** PostgreSQL, Redis
- **Security:** JWT, Helmet, Rate Limiting, AES Encryption, Audit Logs

## Supported Gateways

Stripe, PayPal, Flutterwave, Pesapal, Selcom, DPO Pay (extensible via Gateway Adapter Pattern)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
docker-compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Setup Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Run Development Servers

```bash
npm run dev
```

- **Admin Panel:** http://localhost:5173
- **API:** http://localhost:4000
- **Default Login:** admin@aopay.com / Admin@123456

## Project Structure

```
ao-pay/
├── backend/          # Express API + Prisma
│   ├── src/
│   │   ├── gateways/ # Payment gateway adapters
│   │   ├── services/ # Business logic
│   │   ├── routes/   # API routes
│   │   └── middleware/
│   └── prisma/       # Database schema
├── frontend/         # React admin + payment pages
│   └── src/
│       ├── pages/    # Admin & customer pages
│       └── components/
└── docker-compose.yml
```

## Payment Link Format

```
https://pay.aochats.chat/pay/{SecureToken}
```

Tokens are UUID-based, signed, and support embedded expiration.

## License

Proprietary - AO PAY
