# AO PAY - Deploy Guide

## Architecture

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | https://pay.aochats.chat | Vercel |
| Backend API | https://api.aochats.chat | Vercel |
| Database | Neon PostgreSQL | Cloud |

---

## Step 1 — Push to GitHub

1. Create new repo on GitHub: https://github.com/new
   - Name: `ao-pay`
   - Private (recommended)
   - Do NOT add README (already exists)

2. Run in terminal:
```bash
git remote add origin https://github.com/YOUR_USERNAME/ao-pay.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Frontend (Vercel)

1. Go to https://vercel.com/new
2. Import GitHub repo `ao-pay`
3. Settings:
   - **Project Name:** `ao-pay-frontend`
   - **Root Directory:** `frontend`
   - **Framework:** Vite
4. Environment Variables:
   ```
   VITE_API_URL=https://api.aochats.chat/api
   VITE_APP_URL=https://pay.aochats.chat
   VITE_PAYMENT_BASE_URL=https://pay.aochats.chat/pay
   ```
5. Deploy
6. Add custom domain: `pay.aochats.chat`

---

## Step 3 — Deploy Backend (Vercel)

1. Go to https://vercel.com/new
2. Import same GitHub repo `ao-pay`
3. Settings:
   - **Project Name:** `ao-pay-api`
   - **Root Directory:** `backend`
4. Environment Variables (copy from `backend/.env`):
   ```
   DATABASE_URL=your_neon_url
   JWT_SECRET=your_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   ENCRYPTION_KEY=your_32_char_key
   ENCRYPTION_IV=your_16_char_iv
   FRONTEND_URL=https://pay.aochats.chat
   PAYMENT_BASE_URL=https://pay.aochats.chat/pay
   API_URL=https://api.aochats.chat
   CORS_ORIGIN=https://pay.aochats.chat
   PESAPAL_CONSUMER_KEY=your_key
   PESAPAL_CONSUMER_SECRET=your_secret
   PESAPAL_IPN_ID=your_ipn_id
   PESAPAL_ENV=live
   REDIS_ENABLED=false
   NODE_ENV=production
   ```
5. Deploy
6. Add custom domain: `api.aochats.chat`

---

## Step 4 — DNS Records (aochats.chat)

| Type | Name | Value |
|------|------|-------|
| CNAME | pay | cname.vercel-dns.com |
| CNAME | api | cname.vercel-dns.com |

(Vercel will show exact CNAME values after adding domains)

---

## Step 5 — Pesapal IPN

Set IPN URL in Pesapal Dashboard:
```
https://api.aochats.chat/api/payments/webhooks/pesapal
```

---

## Login

- URL: https://pay.aochats.chat
- Email: ortoman95@gmail.com
- Password: Admin@123456
