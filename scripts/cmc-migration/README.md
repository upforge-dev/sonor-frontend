# CMC Migration Scripts

Scripts to migrate Cincy Mahjong Club data from standalone Supabase to Sonor.

## Prerequisites

1. Access to CMC's Supabase (URL and service role key)
2. Access to Portal's Supabase (URL and service role key)
3. Node.js 18+

## Migration Steps

### Step 1: Export CMC Data

The export script supports both Supabase and direct Postgres connections:

**Option A: If CMC uses Supabase**
```bash
export CMC_SUPABASE_URL="https://xxx.supabase.co"
export CMC_SUPABASE_SERVICE_KEY="xxx"

node scripts/cmc-migration/export-cmc-data.mjs
```

**Option B: If CMC uses Neon/Direct Postgres**
```bash
export CMC_DATABASE_URL="postgresql://user:pass@host/database"

node scripts/cmc-migration/export-cmc-data.mjs
```

This creates JSON files in `./exports/`:
- Individual table exports (`sessions.json`, `blog_posts.json`, etc.)
- Combined export (`cmc-complete-export.json`)
- Summary (`export-summary.json`)

### Step 2: Setup Organization & Project

```bash
# Set Portal Supabase credentials
export PORTAL_SUPABASE_URL="https://xxx.supabase.co"
export PORTAL_SUPABASE_SERVICE_KEY="xxx"

# Run setup
node scripts/cmc-migration/setup-cmc-org.mjs
```

This creates:
- CMC Organization in Portal
- CMC Project
- Admin contact for Christi

**Copy the output environment variables** - you'll need them for the next step.

### Step 3: Import Data to Portal

```bash
# Set Portal credentials + IDs from Step 2
export PORTAL_SUPABASE_URL="https://xxx.supabase.co"
export PORTAL_SUPABASE_SERVICE_KEY="xxx"
export CMC_ORG_ID="xxx-from-step-2"
export CMC_PROJECT_ID="xxx-from-step-2"

# Run import
node scripts/cmc-migration/import-to-portal.mjs
```

### Step 4: Verify Migration

```bash
node scripts/cmc-migration/verify-migration.mjs
```

## Data Mapping

| CMC Table | Portal Table | Notes |
|-----------|--------------|-------|
| `sessions` | `analytics_sessions` | Session tracking |
| `page_views` | `analytics_page_views` | Page view analytics |
| `events` (analytics) | `analytics_events` | Custom events |
| `events` (calendar) | `commerce_offerings` | Events as Commerce offerings |
| `event_registrations` | `commerce_sales` | Registrations as sales |
| `blog_posts` | `blog_posts` | Blog content |
| `leads` | `prospects` | Lead/prospect data |
| `recipients` | `contacts` | Email subscribers |

## Site-Kit Integration

After migration, update CMC's Next.js app:

```bash
cd cincy-mahjong-club
pnpm add @uptrade/site-kit
```

Add to `.env.local`:
```
UPTRADE_PROJECT_ID=<project_id>
NEXT_PUBLIC_SUPABASE_URL=<portal_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<portal_anon_key>
```

Update `app/layout.tsx`:
```tsx
import { SiteKitProvider } from '@uptrade/site-kit'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SiteKitProvider
          projectId={process.env.UPTRADE_PROJECT_ID!}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
          analytics={{ enabled: true }}
          engage={{ enabled: true }}
        >
          {children}
        </SiteKitProvider>
      </body>
    </html>
  )
}
```

## Rollback

CMC's original Supabase remains untouched. If issues occur:
1. Keep using CMC's original database
2. Remove Site-Kit integration
3. Delete the CMC org/project from Portal

## Troubleshooting

### "Table does not exist" errors
CMC might not have all tables created. The export script handles this gracefully.

### Missing data after import
Check the `exports/export-summary.json` for export counts, then compare with `verify-migration.mjs` output.

### Calendar events not showing
CMC's `events` table might contain both analytics events AND calendar events. The import script tries to detect this, but you may need to adjust the filtering logic.
