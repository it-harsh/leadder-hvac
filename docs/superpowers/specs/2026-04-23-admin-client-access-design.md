# Admin + Client Support Access System — Design Spec
**Date:** 2026-04-23  
**Status:** Approved

---

## Overview

Platform admins (Leadder team) can log into a dedicated `/admin` dashboard, browse all client businesses, and enter any client's portal in impersonation mode — provided the client has enabled support access. The feature is fully server-side enforced and uses the existing Supabase Auth system.

---

## Core Concepts

- **Admin user**: A normal Supabase Auth user with a row in the new `platform_admins` table.
- **Impersonation**: Admin enters a client portal context via a server-side HttpOnly cookie. No real auth session change occurs — DB queries switch to service role and filter by the impersonated business ID.
- **Support access gate**: Clients opt-in via a toggle in their Settings page (`support_access_enabled`). Admins cannot impersonate a client with this off.

---

## Database Migrations

### Migration 006 — `platform_admins` table

```sql
CREATE TABLE public.platform_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

- `created_by` tracks which admin created the new admin account.
- No RLS needed — only accessible via service role key.

### Migration 007 — `support_access_enabled` on `business_settings`

```sql
ALTER TABLE public.business_settings
  ADD COLUMN support_access_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

- Defaults to `false` — clients must explicitly opt-in.
- Lives in `business_settings` alongside `widget_enabled`, `ghl_enabled`.

---

## Admin Identity & Auth

- Admin users authenticate at `/auth/login` — same flow as all users.
- They have no `businesses` row (not HVAC business owners).
- `portal/layout.tsx` currently redirects users with no business to `/auth/sign-up`. This is patched: if the user has a row in `platform_admins`, redirect to `/admin` instead.
- The `app/admin/layout.tsx` (server component) queries `platform_admins` on every render. If no row found, redirects to `/portal`. This is the sole admin gate — middleware only enforces authentication (user is logged in), not admin status.

---

## Admin Dashboard — `/admin`

All new routes:

```
app/admin/
  layout.tsx            Server component. Queries platform_admins. Blocks non-admins → /portal.
  page.tsx              Client list: all businesses with name, slug, created_at, support_access_enabled status, "View as Client" button.
  admins/page.tsx       List all platform_admins + "Create Admin" form.
app/api/admin/
  impersonate/route.ts  POST {businessId} → validates support_access_enabled, sets cookie.
  exit/route.ts         POST → clears impersonation cookie → redirects to /admin.
  create-user/route.ts  POST {email, password} → createUser() via service role + inserts platform_admins row.
```

### Client list (`/admin`)
- Table: business name, slug, created date, support access status (badge), "View as Client" action.
- If `support_access_enabled = false`, action is disabled with tooltip: "Client has not enabled support access."

### Admin management (`/admin/admins`)
- Table: email, created_by, created_at.
- "Create Admin" form: email + default password fields.
- On submit: `POST /api/admin/create-user`.

---

## Admin Creation Flow

1. Existing admin fills in email + default password in `/admin/admins`.
2. `POST /api/admin/create-user` uses service role: `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
3. On success, inserts row into `platform_admins(user_id, created_by)`.
4. New admin logs in via `/auth/login` with provided credentials.
5. Password reset is the new admin's responsibility via the existing `/portal/profile` page (already built). No RLS issues — password change goes through Supabase Auth directly.

---

## Impersonation Flow

```
Admin clicks "View as Client"
  → POST /api/admin/impersonate { businessId }
  → Server: verify caller is in platform_admins
  → Server: fetch business_settings.support_access_enabled for businessId
  → If false: return 403 (client has not enabled support access)
  → If true: set HttpOnly cookie leadder_impersonating_business_id=<businessId> (SameSite=Lax)
  → Redirect to /portal
  
portal/layout.tsx on every render:
  → Read cookie leadder_impersonating_business_id
  → If present:
      → Verify current user is in platform_admins (server-side, not from cookie)
      → Fetch business_settings.support_access_enabled for cookie businessId
      → If false: clear cookie, redirect to /admin (revocation enforced immediately)
      → Resolve business = service role client, .eq('id', cookieBusinessId)
  → If absent:
      → Resolve business = anon client, .eq('owner_id', user.id)  [existing behavior]

All portal pages receive business context from layout.
All DB queries while impersonating use service role client filtered by business_id.

Admin clicks "Exit"
  → POST /api/admin/exit
  → Clear cookie
  → Redirect to /admin
```

---

## Impersonation Banner

New component `components/admin/impersonation-banner.tsx`:
- Renders inside `portal/layout.tsx` when impersonation cookie is active.
- Sticky bar at top: `"You are viewing as: [Business Name]"` + Exit button.
- Exit button calls `POST /api/admin/exit`.

---

## Client Support Access Toggle

In Portal → Settings (existing `components/portal/settings-form.tsx`):
- New toggle: `"Allow Leadder support team to access this account"` — default off.
- Saves to `business_settings.support_access_enabled`.
- Revocation is immediate: checked on every portal layout render during active impersonation.

---

## Access Control Summary

| Check | Where | Mechanism |
|---|---|---|
| Is user authenticated? | `proxy.ts` | Supabase session refresh (existing) |
| Is user a platform admin? | `app/admin/layout.tsx` | DB query on `platform_admins` |
| Is impersonation cookie valid? | `app/portal/layout.tsx` | Cookie read + `platform_admins` check + `support_access_enabled` check |
| Impersonated DB queries | All portal pages via layout context | Service role client, filtered by `business_id` |
| Support access revocation | `app/portal/layout.tsx` | Re-checked on every request — immediate enforcement |

**All enforcement is server-side. Frontend banner is informational only.**

---

## Files Changed

### New
| File | Purpose |
|---|---|
| `scripts/clean/006_platform_admins.sql` | `platform_admins` table |
| `scripts/clean/007_support_access.sql` | `support_access_enabled` column on `business_settings` |
| `app/admin/layout.tsx` | Admin route guard + layout shell |
| `app/admin/page.tsx` | Client list |
| `app/admin/admins/page.tsx` | Admin management + create admin form |
| `app/api/admin/impersonate/route.ts` | Set impersonation cookie |
| `app/api/admin/exit/route.ts` | Clear impersonation cookie |
| `app/api/admin/create-user/route.ts` | Create new admin user |
| `components/admin/impersonation-banner.tsx` | Sticky "viewing as" banner |

### Modified
| File | Change |
|---|---|
| `app/portal/layout.tsx` | Impersonation cookie check, service role switch, redirect admins to `/admin` |
| `components/portal/settings-form.tsx` | `support_access_enabled` toggle |
| `components/portal/sidebar.tsx` | "Admin Panel" link for platform admin users |
| `lib/supabase/server.ts` | Add `createServiceClient()` helper + `isPlatformAdmin(userId)` helper |

---

## Out of Scope (MVP)

- Audit logging of admin impersonation sessions
- Email notifications on support access toggle
- Admin activity log
- Per-admin permission levels (all admins have full access)
