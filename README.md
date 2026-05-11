# Leadder

An embeddable HVAC quoting widget + business portal built with Next.js and Supabase.

**Live:** [https://app.leadder.io](https://app.leadder.io)

---

## What it does

Leadder gives HVAC businesses a branded instant-estimate widget they embed on their own website. Homeowners pick their system type, capacity, and tier (Good / Better / Best) and get a live price range — no phone call needed. Every submission is captured as a lead in the business portal.

---

## Features Completed

### Auth & Onboarding
- Sign up, login, forgot password pages
- Business creation on first sign-up (name, slug, phone, email, website)
- Auth-gated portal with Supabase SSR sessions

### Admin Portal
- Dashboard — total leads, pricing tiers configured, widget status at a glance
- Sidebar navigation with logo, page links, business name pill in footer
- Dark / light theme toggle in header
- Dynamic page title in header per route

### Instant Estimator (Pricing Configuration)
- 8 HVAC products: Gas Furnace Split, Cooling Only Split, Mini Split, Packaged System, Furnace, Boiler, Dual Fuel, Heat Pump
- Services: custom service products with single price
- Good / Better / Best pricing grid per product × capacity combination
- Per-capacity toggles — enable/disable individual sizes
- Per-product toggles — show/hide in widget
- Batch save — edit multiple prices then save in one click
- System Config Panel — per tier: efficiency description, warranty years, scope of work (rich text), product image upload with fallback to default images
- TipTap rich text editor for scope of work (bold, italic, H1/H2, bullet lists, numbered lists)
- Price Range % — show a low–high range instead of exact price
- Multi-unit discount % — automatic discount when customer selects 2+ units
- Location adjustments — per-location (attic, basement, closet, garage, crawl space) price add-on
- Mini Split heads — per-head-count add-on cost (2, 3, 4+ heads)
- Fuel type (oil) — oil surcharge for furnace/boiler

### Public Widget
- HVAC tab: full guided multi-step flow
  - System type → Heat source → System config → Capacity → Num heads (mini-split) → Location → Quantity → Contact → Quote results
  - Auto-advance on click (no Continue button)
  - Dot progress indicator + step counter
  - Back navigation
  - Selection summary bar
  - Default product images per system type
- Services tab: service picker → contact form → confirmation
- 3-tier confirmation cards (Good / Better / Best) with image, price range, efficiency, scope of work, warranty
- Financing display — monthly payment estimate on each tier card
- Country code phone input with flag selector (20+ countries)
- Post-submission redirect button (optional CTA)

### Lead Capture
- Leads table in portal with all customer details
- Captures: name, email, phone, address, product, capacity, tier, all 3 prices (good/better/best)

### Widget Embed
- Embed code page with Simple (script tag) and Advanced (manual init) tabs
- Modal preview page — live preview of widget in a popup
- iFrame preview page — widget embedded in a mock website, desktop/mobile toggle

### Settings
- Business info — name, email, phone, website
- Widget customization — title, subtitle, thank you message, enable/disable toggle
- Post-submission button — custom button text + redirect URL on confirmation screen
- Financing — term (months), APR, link text + URL
- Webhook — POST lead JSON to Make.com, Zapier, n8n, HubSpot, Pipedrive, or any CRM
- GoHighLevel (GHL) integration — upsert contact + create opportunity in pipeline on every new lead

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

