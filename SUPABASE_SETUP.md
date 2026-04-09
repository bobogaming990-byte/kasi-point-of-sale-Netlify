# Supabase Setup Guide for Kasi P.O.S

## 🚀 Your Supabase Project

**Project URL:** `https://najaumlvalnwybstqrcx.supabase.co`  
**Connection:** `postgresql://postgres:[YOUR-PASSWORD]@db.najaumlvalnwybstqrcx.supabase.co:5432/postgres`

---

## Step 1: Run Database Schema

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select your project: `najaumlvalnwybstqrcx`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/schema.sql` and paste it
6. Click **Run**
7. ✅ Schema created successfully

---

## Step 2: Get Your API Keys

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy these values:

### For Frontend (Netlify Environment Variables):
```
VITE_SUPABASE_URL=https://najaumlvalnwybstqrcx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb... (copy from anon/public)
```

### For Backend (Netlify Functions - optional):
```
SUPABASE_SERVICE_KEY=eyJhb... (copy from service_role key - keep secret!)
```

⚠️ **NEVER commit keys to GitHub!** Use Netlify environment variables.

---

## Step 3: Enable Realtime

For live inventory sync across devices:

1. Go to **Database** → **Replication**
2. Click **Realtime** tab
3. Enable these tables for Realtime:
   - ✅ `products`
   - ✅ `sales`
   - ✅ `returns`
4. Click **Save**

---

## Step 4: Configure Netlify Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: `kasi-point-of-sale`
3. Go to **Site Settings** → **Environment Variables**
4. Add these variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://najaumlvalnwybstqrcx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...your-anon-key` |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` |
| `PAYSTACK_WEBHOOK_SECRET` | `your-webhook-secret` |

5. Click **Save**

---

## Step 5: Deploy & Test

```bash
# Test locally (with Supabase connected)
npm run dev

# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

---

## 🧪 Testing Multi-Device Sync

1. Open Kasi P.O.S in **Browser A** (Chrome)
2. Open Kasi P.O.S in **Browser B** (Firefox or Incognito)
3. Log in with same company on both
4. Make a sale on Browser A
5. Watch Browser B → Sale appears instantly! 🔥

---

## 📊 Data Migration (Existing Users)

If you have existing localStorage data to migrate:

1. Log in as admin
2. Go to **Settings** → **Data Migration**
3. Click **Migrate to Cloud**
4. All local data will sync to Supabase

---

## 🔐 Security Features

| Feature | Status |
|---------|--------|
| Row Level Security (RLS) | ✅ Enabled |
| JWT Authentication | ✅ Enabled |
| Company Isolation | ✅ All queries filtered by `company_id` |
| Real-time Subscriptions | ✅ Secure per-tenant |

---

## 🆘 Troubleshooting

### "Supabase not configured" error
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Netlify
- Redeploy after adding env vars

### Real-time not working
- Verify Realtime is enabled for tables in Supabase
- Check browser console for WebSocket errors
- Ensure you're not behind a firewall blocking wss://

### CORS errors
- Add your Netlify domain to Supabase **API Settings** → **Allowed Origins**

---

## 📝 Next Steps

After setup, your system will:

✅ Sync data across all devices in real-time  
✅ Support offline mode with auto-sync  
✅ Scale to unlimited devices per company  
✅ Provide cloud backups  
✅ Enable true multi-device POS operations  

---

**Need help?** Check Supabase docs: https://supabase.com/docs
