# Using Supabase MCP Server with Kasi P.O.S

## Your MCP Configuration

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=najaumlvalnwybstqrcx"
      ]
    }
  }
}
```

**Project:** `najaumlvalnwybstqrcx`  
**Host:** `db.najaumlvalnwybstqrcx.supabase.co`  
**Port:** `5432`

---

## Step 1: Get Your Database Password

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select project: **najaumlvalnwybstqrcx**
3. Go to **Project Settings** → **Database**
4. Copy your **Database Password**
5. Use it in the connection string:

```
postgresql://postgres:YOUR_PASSWORD@db.najaumlvalnwybstqrcx.supabase.co:5432/postgres
```

---

## Step 2: Execute Schema via MCP

Once your MCP server is connected, you can run SQL commands:

### Option A: Use Supabase SQL Editor (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/schema.sql` file
3. Copy all contents
4. Paste and Run

### Option B: Use psql with MCP
```bash
# Connect via MCP/Session Pooler
psql "postgresql://postgres:YOUR_PASSWORD@db.najaumlvalnwybstqrcx.supabase.co:5432/postgres"

# Then run:
\i supabase/schema.sql
```

---

## Step 3: Get API Keys for Frontend

From Supabase Dashboard → Project Settings → API:

```
VITE_SUPABASE_URL=https://najaumlvalnwybstqrcx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG... (copy this exact value)
```

---

## Quick Commands Reference

### Test Connection
```sql
SELECT version();
```

### Check Tables Created
```sql
\dt
```

### Verify RLS Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;
```

### Enable Realtime for a Table
```sql
-- In Supabase Dashboard → Database → Replication → Realtime
-- Or via SQL:
BEGIN;
  -- Add table to realtime publication
  CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE sales;
COMMIT;
```

---

## Testing the Setup

1. **Execute schema** in SQL Editor
2. **Copy API keys** to `.env` file
3. **Run build**: `npm run build`
4. **Test locally**: `npm run dev`
5. **Deploy**: Push to trigger Netlify deploy

---

## Troubleshooting MCP Connection

### If MCP connection fails:
1. Ensure you have the correct password
2. Check if Session Pooler is enabled (for IPv4 networks)
3. Verify project ref is correct: `najaumlvalnwybstqrcx`
4. Check firewall isn't blocking port 5432

### Using IPv4 Session Pooler (if needed):
```
postgresql://postgres:YOUR_PASSWORD@db.najaumlvalnwybstqrcx.supabase.co:5432/postgres
```

---

## Ready to Deploy! 🚀

Once schema is executed and API keys are configured, your multi-device sync is ready!
