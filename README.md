# Leadder

An embeddable HVAC quoting widget + business portal built with Next.js and Supabase.

**Live:** [https://leadder-ochre.vercel.app](https://leadder-ochre.vercel.app)

---

## What it does

Leadder gives HVAC businesses a branded instant-estimate widget they embed on their own website. Homeowners pick their system type, capacity, and tier (Good / Better / Best) and get a live price range — no phone call needed. Every submission is captured as a lead in the business portal.

---

## Features

### Widget (customer-facing, embedded via iframe)
- Guided HVAC flow: System Type → Heat Source → System Config → Capacity → Install Location → Quantity → Contact → 3-tier quote
- Services flow: flat-price service selection → Contact → Confirmation
- Good / Better / Best quote display with tier images, efficiency description, warranty, and scope of work
- Financing monthly payment display (configurable APR + term)
- Redirect button after quote (e.g. to booking page)
- Fully responsive — works on mobile, tablet, desktop
- Three embed options: iframe, button + popup modal, direct link

### Portal (business dashboard at `/portal`)
- **Instant Estimator** — configure Good / Better / Best pricing per product and capacity with per-location surcharges (attic, basement, closet, garage, crawl space) and multi-unit discounts
- **System Config** — set tier images, efficiency descriptions, warranty years, and scope of work per tier; apply to all capacities in one click
- **Leads** — view and manage every quote submission with status tracking
- **Widget** — copy iframe, modal, or direct-link embed code
- **Settings**
  - *General* — widget title, subtitle, thank-you message, price range %, redirect URL + button text
  - *Financing* — enable/disable, APR, term months, link text + URL
  - *Integrations* — webhook URL for forwarding leads to Make.com, Zapier, n8n, GHL, etc.
- **Profile** — business name, phone, email, website, address
- Light / dark theme toggle

### Auth
- Email + password sign up / sign in
- Email confirmation flow
- Forgot password / reset password

---

## Not yet built

| Feature | Notes |
|---|---|
| Business logo upload | `logo_url` column removed — no upload UI was ever built |
| Email notifications | No email to business owner on new lead |
| Lead CSV export | Leads are view-only in the portal |
| Analytics / charts | No conversion rate, revenue trends, or funnel reporting |
| Multi-user / team | Single owner per business account |
| PDF / invoice generation | No quote PDF for the homeowner |
| Payment processing | Leadder captures intent only, no payments |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deployment | Vercel |

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Add environment variables
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_APP_URL

# 3. Run schema (Supabase SQL Editor)
# Execute scripts/clean/001_schema.sql on a fresh project

# 4. Start dev server
npm run dev
```

---

## Project structure

```
app/
  portal/            # Business dashboard (estimator, leads, widget, settings, profile)
  widget/[slug]/     # Public quote widget (customer-facing)
  api/               # Route handlers (leads, widget data, webhooks, auth)
  auth/              # Login, sign-up, forgot/reset password pages
components/
  portal/            # Dashboard UI (sidebar, header, estimator, settings, leads)
  widget/            # Embeddable widget flow (widget-flow.tsx)
  ui/                # shadcn/ui primitives
lib/
  supabase/          # Client + server Supabase helpers
  types/             # TypeScript interfaces
  utils/             # Shared utilities (HVAC unit conversions, etc.)
scripts/
  clean/             # SQL schema — run 001_schema.sql to bootstrap
public/
  leadder_logo.svg   # Full wordmark (used in portal + auth pages)
  icon.svg           # Funnel mark only (favicon via app/icon.svg)
```

---

## Widget flow

```
HVAC tab
  System Type (Heating & Cooling / Heating / A/C)
    └─ Heat Source (Gas / Electric / Oil / Dual Fuel)  ← skipped for A/C
         └─ System Config (varies by combination)       ← skipped for Dual Fuel
              └─ Capacity → Location → Qty → Contact → Confirmation (3-tier quote)

Services tab
  Service picker → Contact → Confirmation (flat price)
```

---

## Widget embed options

### 1. Iframe (simplest)
```html
<iframe src="https://your-domain.com/widget/your-slug"
  width="100%" height="700" frameborder="0"
  style="border:none; max-width:100%;">
</iframe>
```

### 2. Button + popup modal
```html
<button onclick="document.getElementById('leadder-modal').style.display='flex'"
  style="background:#4f46e5;color:#fff;padding:14px 28px;border:none;
         border-radius:50px;font-size:15px;font-weight:600;cursor:pointer;">
  Get Your Instant Quote →
</button>

<!-- Place once before </body> -->
<div id="leadder-modal"
  onclick="if(event.target.id==='leadder-modal')this.style.display='none'"
  style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);
         z-index:999999;align-items:center;justify-content:center;padding:16px;">
  <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;
              max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:16px 24px;border-bottom:1px solid #e5e7eb;">
      <strong style="font-size:15px;color:#111827;">Get Your Instant Quote</strong>
      <button onclick="document.getElementById('leadder-modal').style.display='none'"
        style="background:none;border:none;cursor:pointer;font-size:24px;
               color:#9ca3af;line-height:1;padding:0;">×</button>
    </div>
    <iframe src="https://your-domain.com/widget/your-slug"
      width="100%" height="580" frameborder="0" style="display:block;" loading="lazy">
    </iframe>
  </div>
</div>
```

---

## Webhook payload

Configure a webhook URL in Portal → Settings → Integrations. Fired on every lead:

```json
{
  "event": "lead.created",
  "lead": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+1 555-000-0000",
    "productName": "Split System - Gas Furnace",
    "capacityLabel": "3 Ton",
    "tierSelected": "better",
    "priceGood": 4200,
    "priceBetter": 5800,
    "priceBest": 7500,
    "submittedAt": "2026-04-03T12:00:00Z"
  }
}
```

