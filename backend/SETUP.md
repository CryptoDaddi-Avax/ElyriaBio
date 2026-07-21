# Elyria Bio — Backend Setup (beginner-friendly)

You do **not** need to know how to code. This is copy, paste, click.
Total time: about 30–40 minutes, one time only.

We use **Supabase** — a free hosted database with a friendly dashboard
(spreadsheet-like screens where you edit stock, read signups, see orders).
Nothing runs on your Hostinger server; your website just *talks to*
Supabase over the internet. That's why it's easy to manage.

---

## What you'll end up with
- A dashboard where you change any product's **stock number** and it
  updates the live site.
- A table of everyone who clicked **"Notify me when in stock."**
- **Real emails** sent to those people (via Resend) when you restock.
- Tables for orders, customers, affiliates, discounts, and COAs.

---

## STEP 1 — Make a Supabase account (5 min)
1. Go to **https://supabase.com** → **Start your project** → sign in with Google.
2. Click **New project**.
   - Name: `elyria-bio`
   - Database password: click **Generate**, then **copy it somewhere safe**.
   - Region: pick the one closest to you.
3. Click **Create new project** and wait ~2 minutes while it builds.

## STEP 2 — Create the tables (3 min)
1. Left sidebar → **SQL Editor** → **+ New query**.
2. Open the file `sql/01_schema.sql` from this package, copy ALL of it,
   paste into the box, click **Run** (bottom right). You should see "Success".
3. New query again → paste `sql/02_policies.sql` → **Run**.
4. New query again → paste `sql/03_seed.sql` → **Run**.
   This loads all 30 products with their current stock numbers.

✅ Click **Table Editor** in the sidebar — you'll see your `products`
   table full of rows. This is where you can edit stock by hand too.

## STEP 3 — Get your two keys (2 min)
1. Sidebar → **Project Settings** (gear icon) → **API**.
2. Copy **Project URL** and the **anon public** key.
3. Open `site/backend-config.js` from this package in any text editor
   (Notepad is fine) and paste them between the quotes:
   ```js
   window.ELYRIA_BACKEND = {
     url:     "https://YOURPROJECT.supabase.co",
     anonKey: "eyJhbGc...your anon key..."
   };
   ```
4. Save the file.

## STEP 4 — Upload the site files (5 min)
Upload these files to your website's main folder on Hostinger
(File Manager → public_html), overwriting the old ones:
- `backend-config.js`   (the one you just edited)
- `supabase-client.js`
- `product.js`
- `admin.js`, `admin-data.js`
- the `products/` folder (all the updated product pages)
- `Elyria Bio Console.html`

> Antigravity tip: if you deploy through Google Antigravity, just commit
> these files to your project and let it push — same result.

**That's the minimum.** Your site now reads live stock from Supabase and
saves "Notify me" signups into the database. To send real emails, do Step 5–7.

---

## STEP 5 — Make a Resend account for emails (5 min)
1. Go to **https://resend.com** → sign up (free tier is plenty to start).
2. Dashboard → **API Keys** → **Create API Key** → copy it (starts `re_`).
3. (Recommended) **Domains** → add `elyriabio.com` and follow their DNS
   steps in Hostinger so email comes *from* your domain. You can skip this
   at first and Resend will send from a test address.

## STEP 6 — Create your admin login (2 min)
1. Supabase sidebar → **Authentication** → **Users** → **Add user** →
   **Create new user**. Enter your email + a password. This is the login
   that can change everything.

## STEP 7 — Turn on restock emails (8 min)
This deploys one small function that emails your waitlist.
1. Install the Supabase tool: on your computer open a terminal and run
   `npm install -g supabase` (needs Node.js from https://nodejs.org).
2. `supabase login`  (opens your browser to confirm)
3. `supabase link --project-ref YOURPROJECT`
   (the `YOURPROJECT` part is in your Project URL)
4. Copy the `functions/send-restock` folder from this package into a
   `supabase/functions/` folder, then run:
   ```
   supabase functions deploy send-restock --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set FROM_EMAIL="Elyria Bio <alerts@elyriabio.com>"
   ```

Done. Now in your admin console, setting a product back above 0 and
clicking **Email waitlist** will send everyone the "back in stock" email.

---

## DAILY USE — how you actually manage things
- **Change stock:** Supabase → Table Editor → `products` → click a
  `stock` cell → type the new number → Enter. The site updates instantly.
  (Or use the Products screen in your admin console.)
- **See who wants a restock alert:** Table Editor → `notify_signups`.
- **Orders / customers / affiliates / discounts / COAs:** each has its
  own table you can view and edit the same way.

## Troubleshooting
- Site still shows old stock? You probably didn't paste the keys into
  `backend-config.js`, or didn't upload it. Re-check Step 3–4.
- Nothing breaks if the backend is misconfigured — the site quietly falls
  back to its built-in numbers, so customers never see an error.
- Emails not arriving? Check Resend → Logs, and that the domain/DNS in
  Step 5 is verified.

Questions to hand a developer if you get stuck: "Supabase project is set
up with the schema in /sql; I need help finishing the edge function
deploy in SETUP.md step 7."
