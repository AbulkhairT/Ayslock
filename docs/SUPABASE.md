# Going live with Supabase, Vercel and Resend

This turns Ayslock from demo mode into the real thing: real accounts (Supabase Auth), one shared database (Supabase Postgres) and real emails (Resend). Plan on about 20 minutes. You need to be signed in to Supabase, Vercel and Resend yourself; nobody else can do these steps for you.

When everything is connected, the yellow "Demo mode" bar at the top of the site disappears. If it's still there, it lists exactly what is still simulated.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region close to your Vercel region (Vercel → Project → Settings → Functions shows it; the default is Washington, D.C. `iad1`, so choose **East US**).
2. Save the database password somewhere safe.

## 2. Connect Supabase to Vercel

**Easiest: the Vercel integration.** In Vercel, open the Ayslock project → **Storage** (or **Integrations**) → **Supabase** → connect the project you just made, for Production and Preview. It adds the variables the app reads:

| Variable | What it is |
| --- | --- |
| `POSTGRES_URL` | Database connection through Supabase's pooler |
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The public key (either name works) |

**Or add them by hand** (Vercel → Project → Settings → Environment Variables):

- `DATABASE_URL`: Supabase → **Connect** (top bar) → **Connection string** → **Transaction pooler** (port 6543). Replace `[YOUR-PASSWORD]`. Don't use the "Direct connection": it's IPv6 only and Vercel can't reach it.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → **API**.

If the integration asked for a prefix (for example `STORAGE_`), that's fine: the app also reads `STORAGE_POSTGRES_URL`, `STORAGE_SUPABASE_URL` and so on.

> If you connected **Neon** earlier, disconnect it (Vercel → Storage) or delete its `DATABASE_URL`. `DATABASE_URL` wins over `POSTGRES_URL`, so a leftover Neon URL would keep the app on Neon.

## 3. Create the tables

Nothing to do: on the first request the app creates every table, constraint and security rule itself, once, even if several server copies start together.

If you'd rather see it happen, open Supabase → **SQL Editor** → **New query**, paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**. The app will see the tables and skip its own setup.

## 4. Supabase Auth settings

1. Supabase → **Authentication** → **URL Configuration**
   - **Site URL:** your live address, e.g. `https://ayslock.vercel.app` or your own domain.
   - **Redirect URLs:** add `https://YOUR-DOMAIN/auth/callback`.
2. Supabase → **Authentication** → **Sign In / Providers** → **Email**: leave **Confirm email** on. New providers get a link, tap it, and land straight in setup with the username they claimed.
3. **Send those emails through Resend** (step 5 first, then come back). Supabase's built-in mailer only delivers to your own team's addresses and only a few per hour, so real sign-ups won't get their link without this. Supabase → **Authentication** → **Emails** → **SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key
   - Sender email: an address on the domain you verified in Resend, e.g. `hello@your-domain.com`

## 5. Resend (booking emails)

1. [resend.com](https://resend.com) → **Domains** → add your domain and add the DNS records it shows. Wait until it says **Verified**.
2. **API Keys** → create one with sending access.
3. In Vercel add:
   - `RESEND_API_KEY` = that key
   - `EMAIL_FROM` = `Ayslock <bookings@your-domain.com>` (must be on the verified domain)

Confirmations, cancellations, approval requests and private links are sent right after each action.

## 6. The rest of the settings (Vercel → Environment Variables)

| Variable | Value |
| --- | --- |
| `APP_URL` | Your live address, e.g. `https://ayslock.vercel.app` (used in emails and QR codes) |
| `APP_SECRET` | 64 random characters. Run `openssl rand -hex 32`, or use any password generator |
| `CRON_SECRET` | Another random string, for step 7 |

Then **Deployments** → the latest one → **⋯** → **Redeploy**, so the new variables take effect.

## 7. Reminders the day before (optional)

Reminders and the clean-up of expired requests run when something calls the app every few minutes. Vercel's free plan can't do that, so use a free scheduler such as [cron-job.org](https://cron-job.org):

- URL: `https://YOUR-DOMAIN/api/cron/notifications`
- Method: `POST`, every 5 minutes
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

Without it, everything else works; there are just no 24-hour reminders. Expired requests still free their slot on time, and their status is updated the next time someone books with that provider or the provider opens their schedule.

## 8. Check it works

1. Open `https://YOUR-DOMAIN/api/status`. It shows which variable each part is using (names only, never values), whether the database answers, and whether sign-in and email are real or simulated.
2. Open the site: the yellow demo bar is gone.
3. Claim a username on the home page → create an account → confirm from the email → finish setup.
4. In a private window, open `/@yourname`, book a time with your own email. You get the confirmation, and the provider email gets "New booking".
5. In Supabase → **Table Editor** you'll see the provider, service, client and appointment rows.

Demo accounts (@marco, @lena, @sofia) only exist in demo mode; the live site starts empty.

---

## Database schema

All times are stored in UTC (`timestamptz`); each provider keeps their IANA timezone. Every table has row level security on: the public Supabase keys can't read anything, and a signed-in provider can only reach their own rows. The app's server connects with the database role, so its own queries aren't limited by these rules; it scopes everything by the signed-in provider in code.

| Table | Holds | Notable rules |
| --- | --- | --- |
| `providers` | One row per provider: `owner_id` (the Supabase Auth user), `username`, name, bio, timezone, location, booking mode (`open` / `approval` / `private`), notice, booking window, buffer, how long requests are held, how long private links last | Username is 3 to 30 lowercase letters, digits or `_`, unique regardless of case. One profile per account. |
| `services` | What can be booked: name, description, length in minutes, price in cents, currency, active, order | Length 5 to 720 minutes; price can be empty |
| `weekly_hours` | Working hours per weekday (1 = Monday) in the provider's local time; several rows per day make breaks | End after start |
| `availability_exceptions` | Days off or special hours for a date | Empty times = closed all day |
| `clients` | People who booked: name, email, phone, the provider's private notes | One row per provider and email |
| `appointments` | Bookings and blocked time: status (`pending`, `confirmed`, `cancelled`, `declined`, `expired`), start, end, end plus buffer, both timezones, client note | **No two live appointments for a provider can overlap**, enforced by the database itself, so two people can't get the same slot even at the same instant. Pending requests must have an expiry. |
| `access_grants` | Invite-only requests and the private links made from them: status, expiry | Links can be turned off at any time |
| `notifications` | Every email: who, subject, body, when to send, status, attempts | Each email has a unique key, so nothing is sent twice |
| `rate_limits` | Counters that slow down abuse of sign-up, log-in, lookups and booking | |
| `schema_migrations` | Which setup scripts have run | |

Booking and manage links are signed with `APP_SECRET` and never stored, so a database leak doesn't expose them. Changing `APP_SECRET` invalidates links already sent.
