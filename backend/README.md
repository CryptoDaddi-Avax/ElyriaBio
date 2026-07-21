# Elyria Bio — Backend Package

Start with **SETUP.md** — it walks you through everything step by step.

## What's in this folder
- `SETUP.md`            — the guide. Read this first.
- `sql/01_schema.sql`   — creates all database tables. Run 1st.
- `sql/02_policies.sql` — security rules (who can read/write). Run 2nd.
- `sql/03_seed.sql`     — loads your 30 products + stock. Run 3rd.
- `functions/send-restock/index.ts` — sends "back in stock" emails (Resend).
- `site/backend-config.js`   — paste your 2 Supabase keys here.
- `site/supabase-client.js`  — connects the website to the backend.

## The big picture
Website (Hostinger) ⇄ Supabase (database + dashboard) ⇄ Resend (emails)

You manage day-to-day from the Supabase dashboard — no coding, no server
maintenance. The site keeps working even before setup is finished.
