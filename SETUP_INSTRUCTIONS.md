# LabKey Stock Manager - Database Setup

## Option 1: Run SQL in Supabase Dashboard (Easiest)

1. Go to: https://zudpzwatgdmswivbfuvr.supabase.co
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Open `supabase-setup.sql` file
5. Copy all the SQL
6. Paste into SQL Editor
7. Click "Run"
8. Done!

## Option 2: Use Supabase CLI (If installed locally)

```bash
supabase login
supabase link --project-ref zudpzwatgdmswivbfuvr
supabase db push
```

## Verify Setup

After running the SQL, test with:
```sql
SELECT COUNT(*) FROM products;
```

Should return: 67

## Environment Variables for Deployment

```
VITE_SUPABASE_URL=https://zudpzwatgdmswivbfuvr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHB6d2F0Z2Rtc3dpdmJmdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTQzNTksImV4cCI6MjA4ODA3MDM1OX0.-gePh1rVb4vD00PeRpngDSiitGxtVGykpuongQgaRGQ
```
