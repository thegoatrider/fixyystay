# [DEPRECATED / UNRELIABLE] FixyStays Database Schema & Code Cross-Reference

> ⚠️ **WARNING: UNRELIABLE DOCUMENT**: This document was derived from unapplied or legacy repository SQL migration scripts and does NOT reflect live production database reality. DO NOT USE THIS FILE OR ANY SQL FILES AS SCHEMA TRUTH. The sole source of truth is `docs/DB_TRUTH_columns.csv` and `docs/DB_TRUTH_fks.csv`.

## Table of Contents
- [account_deletion_requests](#account-deletion-requests)
- [bookings](#bookings)
- [campaign_logs](#campaign-logs)
- [campaigns](#campaigns)
- [conversations](#conversations)
- [employee_attendance](#employee-attendance)
- [guest_checkins](#guest-checkins)
- [guest_hub_payments](#guest-hub-payments)
- [guest_hub_platform_settings](#guest-hub-platform-settings)
- [guest_hub_settings](#guest-hub-settings)
- [guest_identity](#guest-identity)
- [hub_bills](#hub-bills)
- [hub_event_logs](#hub-event-logs)
- [hub_messages](#hub-messages)
- [hub_offers](#hub-offers)
- [hub_payments](#hub-payments)
- [hub_requests](#hub-requests)
- [hub_staff_users](#hub-staff-users)
- [hub_stays](#hub-stays)
- [hub_tables](#hub-tables)
- [influencer_clicks](#influencer-clicks)
- [influencer_links](#influencer-links)
- [influencer_promotion_requests](#influencer-promotion-requests)
- [influencer_properties](#influencer-properties)
- [influencers](#influencers)
- [lead_notes](#lead-notes)
- [lead_tags](#lead-tags)
- [leads](#leads)
- [message_queue](#message-queue)
- [messages](#messages)
- [ocr_cache](#ocr-cache)
- [organizations](#organizations)
- [owner_google_tokens](#owner-google-tokens)
- [owner_payments](#owner-payments)
- [owner_subscriptions](#owner-subscriptions)
- [owners](#owners)
- [payout_requests](#payout-requests)
- [profiles](#profiles)
- [properties](#properties)
- [property_employees](#property-employees)
- [property_owner_leads](#property-owner-leads)
- [property_rooms](#property-rooms)
- [room_availability](#room-availability)
- [room_rates](#room-rates)
- [rooms](#rooms)
- [seo_landmarks](#seo-landmarks)
- [seo_locations](#seo-locations)
- [seo_property_types](#seo-property-types)
- [subscription_reminder_logs](#subscription-reminder-logs)
- [support_messages](#support-messages)
- [user_push_tokens](#user-push-tokens)
- [wallet_transactions](#wallet-transactions)
- [whatsapp_accounts](#whatsapp-accounts)
- [whatsapp_templates](#whatsapp-templates)

---

## Executive Discrepancy Flags
### 1. Tables in DB/SQL Never Used in Code
- `public.hub_bills` (defined in supabase/migrations/20261011000000_guest_hub_foundation.sql)
- `public.hub_messages` (defined in supabase/migrations/20261011000000_guest_hub_foundation.sql)
- `public.hub_offers` (defined in supabase/migrations/20261011000000_guest_hub_foundation.sql)
- `public.hub_payments` (defined in supabase/migrations/20261011000000_guest_hub_foundation.sql)
- `public.hub_tables` (defined in supabase/migrations/20261011000000_guest_hub_foundation.sql)
- `public.lead_notes` (defined in supabase/migrations/20260610000000_whatsapp_crm.sql)
- `public.lead_tags` (defined in supabase/migrations/20260610000000_whatsapp_crm.sql)
- `public.seo_landmarks` (defined in supabase/seo_schema.sql)

### 2. Discrepant / Missing Columns Referenced in Code
- `public.bookings.date`: Referenced in `src/app/dashboard/owner/property/[id]/page.tsx` (Total 1 files)
- `public.bookings.price`: Referenced in `src/app/dashboard/owner/property/[id]/page.tsx` (Total 1 files)
- `public.bookings.total_amount`: Referenced in `src/app/guest/profile/actions.ts` (Total 1 files)
- `public.campaigns.audience_type`: Referenced in `src/app/dashboard/owner/campaigns/page.tsx` (Total 1 files)
- `public.campaigns.scheduled_at`: Referenced in `src/app/dashboard/owner/campaigns/page.tsx` (Total 1 files)
- `public.campaigns.total_failed`: Referenced in `src/app/dashboard/owner/campaigns/page.tsx` (Total 1 files)
- `public.guest_checkins.amount`: Referenced in `src/app/dashboard/owner/profile/page.tsx` (Total 1 files)
- `public.guest_hub_settings.name`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.guest_identity.address`: Referenced in `src/app/checkin/verify-action.ts` (Total 2 files)
- `public.hub_requests.status`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.hub_stays.service`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.hub_stays.status`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.influencer_clicks.amount`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.influencer_clicks.created_at`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.influencer_clicks.status`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.influencer_links.tracking_code`: Referenced in `src/app/dashboard/agent/page.tsx` (Total 1 files)
- `public.influencer_promotion_requests.pitch`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.influencers.instagram`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 2 files)
- `public.leads.body_text`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.leads.category`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.leads.components`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.leads.header_type`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.leads.language`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.message_queue.text`: Referenced in `src/app/dashboard/owner/whatsapp/inbox/page.tsx` (Total 1 files)
- `public.messages.attachment_url`: Referenced in `src/app/dashboard/messages/actions.ts` (Total 2 files)
- `public.owner_payments.transaction_id`: Referenced in `src/app/api/admin/repair/route.ts` (Total 1 files)
- `public.owner_subscriptions.google_email`: Referenced in `src/app/dashboard/owner/page.tsx` (Total 1 files)
- `public.owner_subscriptions.property_id`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.owners.area_name`: Referenced in `src/app/dashboard/messages/actions.ts` (Total 1 files)
- `public.owners.checkout_date`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.owners.city_area`: Referenced in `src/app/dashboard/messages/support-actions.ts` (Total 1 files)
- `public.owners.end_date`: Referenced in `src/app/onboarding/actions.ts` (Total 2 files)
- `public.owners.guest_name`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.owners.guest_phone`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.owners.helpdesk_number`: Referenced in `src/app/pricing/business/actions.ts` (Total 1 files)
- `public.owners.owner_id`: Referenced in `src/app/dashboard/messages/support-actions.ts` (Total 7 files)
- `public.owners.owner_subscriptions`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.owners.property_id`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.owners.room_number`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.owners.status`: Referenced in `src/app/onboarding/actions.ts` (Total 3 files)
- `public.payout_requests.upi_id`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.properties.access_ends_at`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.properties.base_price`: Referenced in `src/app/guest/property/[id]/actions.ts` (Total 2 files)
- `public.properties.email`: Referenced in `src/app/api/admin/repair/route.ts` (Total 1 files)
- `public.properties.ended_at`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.properties.featured`: Referenced in `src/app/dashboard/admin/actions.ts` (Total 1 files)
- `public.properties.image_urls`: Referenced in `src/app/dashboard/admin/actions.ts` (Total 3 files)
- `public.properties.influencer_id`: Referenced in `src/app/dashboard/agent/page.tsx` (Total 1 files)
- `public.properties.pincode`: Referenced in `src/app/onboarding/actions.ts` (Total 1 files)
- `public.properties.product_name`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.properties.property_id`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 3 files)
- `public.properties.room_availability`: Referenced in `src/app/guest/property/[id]/page.tsx` (Total 1 files)
- `public.properties.room_categories`: Referenced in `src/app/dashboard/owner/property/[id]/actions.ts` (Total 1 files)
- `public.properties.room_number`: Referenced in `src/app/dashboard/owner/actions.ts` (Total 1 files)
- `public.properties.state`: Referenced in `src/app/onboarding/actions.ts` (Total 1 files)
- `public.properties.tracking_code`: Referenced in `src/app/dashboard/agent/page.tsx` (Total 1 files)
- `public.property_employees.employee_attendance`: Referenced in `src/app/dashboard/owner/employees-actions.ts` (Total 1 files)
- `public.property_employees.police_verification_status`: Referenced in `src/app/dashboard/police/police-actions.ts` (Total 1 files)
- `public.property_rooms.access_ends_at`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.departments`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.ended_at`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.login_id`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.name`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.role`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.service`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.property_rooms.status`: Referenced in `src/app/actions/guest-hub.ts` (Total 1 files)
- `public.rooms.image_urls`: Referenced in `src/app/dashboard/admin/actions.ts` (Total 1 files)
- `public.rooms.room_number`: Referenced in `src/app/dashboard/owner/property/[id]/edit/page.tsx` (Total 2 files)
- `public.seo_locations.id`: Referenced in `src/lib/seo-fetchers.ts` (Total 1 files)
- `public.wallet_transactions.status`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.wallet_transactions.upi_id`: Referenced in `src/app/dashboard/admin/page.tsx` (Total 1 files)
- `public.whatsapp_accounts.display_phone_number`: Referenced in `src/app/dashboard/owner/MarketingSection.tsx` (Total 1 files)
- `public.whatsapp_accounts.quality_rating`: Referenced in `src/app/dashboard/owner/MarketingSection.tsx` (Total 1 files)
- `public.whatsapp_accounts.verified_name`: Referenced in `src/app/dashboard/owner/MarketingSection.tsx` (Total 1 files)
- `public.whatsapp_templates.header_type`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 2 files)
- `public.whatsapp_templates.language`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 1 files)
- `public.whatsapp_templates.name`: Referenced in `src/app/dashboard/owner/campaigns/create/page.tsx` (Total 2 files)

---

## Database Tables

### `account_deletion_requests`
**Defined in:** `supabase/migrations/20260724000000_add_account_deletion_requests.sql`

**Code References:**
- **Writes (1):** `src/app/actions/delete-account.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `account_type` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL | Unreferenced in static queries |
| `email` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `phone` | `TEXT` | - | Used |
| `reason` | `TEXT` | - | Used |
| `status` | `TEXT` | NOT NULL DEFAULT 'pending' | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow public insert to account_deletion_requests` | `INSERT` | `PUBLIC` | `-` | `true` |
| `Admins can view all account deletion requests` | `SELECT` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id ...` | `-` |
| `Admins can update account deletion requests` | `UPDATE` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id ...` | `-` |

---

### `bookings`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (7):** `src/app/api/webhooks/razorpay/route.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/owner/campaigns/[id]/page.tsx`, `src/app/dashboard/owner/property/[id]/page.tsx`, `src/app/dashboard/police/page.tsx` *(and 2 more)*
- **Writes (3):** `src/app/api/webhooks/razorpay/route.ts`, `src/app/api/webhooks/route.ts`, `src/app/guest/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `amount` | `NUMERIC` | NOT NULL | Used |
| `campaign_id` | `UUID` | REFERENCES public.campaigns(id) ON DELETE SET NULL | Unreferenced in static queries |
| `checkin_date` | `DATE` | - | Used |
| `checkout_date` | `DATE` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `guest_email` | `TEXT` | - | Unreferenced in static queries |
| `guest_name` | `TEXT` | NOT NULL | Used |
| `guest_phone` | `TEXT` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `influencer_id` | `UUID` | REFERENCES public.influencers(id) ON DELETE SET NULL | Used |
| `num_guests` | `INTEGER` | DEFAULT 1 | Unreferenced in static queries |
| `num_rooms` | `INTEGER` | DEFAULT 1 | Unreferenced in static queries |
| `payment_status` | `TEXT` | DEFAULT 'pending' CHECK (payment_status IN ('pending' | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `razorpay_order_id` | `TEXT` | - | Unreferenced in static queries |
| `razorpay_payment_id` | `TEXT` | - | Used |
| `room_details` | `JSONB` | DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `room_id` | `UUID` | REFERENCES public.rooms(id) ON DELETE SET NULL | Used |
| `status` | `TEXT` | DEFAULT 'confirmed' CHECK (status IN ('confirmed' | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE SET NULL | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `room_id` &rarr; `public.rooms(id)`
- `user_id` &rarr; `public.auth(id)`
- `influencer_id` &rarr; `public.influencers(id)`
- `user_id` &rarr; `public.auth(id)`
- `campaign_id` &rarr; `public.campaigns(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Clients can create pending bookings` | `INSERT` | `PUBLIC` | `-` | `payment_status = 'pending' AND 
    (user_id = auth.uid() OR user_id IS NULL)` |
| `Guests can view own bookings` | `SELECT` | `PUBLIC` | `user_id = auth.uid()` | `-` |
| `Guests can update own pending bookings` | `UPDATE` | `PUBLIC` | `user_id = auth.uid() AND payment_status = 'pending'` | `user_id = auth.uid() AND 
    payment_status = 'pending'` |
| `Owners can view bookings for their properties` | `SELECT` | `PUBLIC` | `property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FR...` | `-` |
| `Influencers can view bookings referred by them` | `SELECT` | `PUBLIC` | `influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() O...` | `-` |
| `Users can view own bookings` | `SELECT` | `PUBLIC` | `auth.uid() = user_id` | `-` |

---

### `campaign_logs`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql, supabase/whatsapp_campaigns.sql`

**Code References:**
- **Reads (1):** `src/app/api/campaigns/process/route.ts`
- **Writes (2):** `src/app/api/campaigns/process/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `campaign_id` | `UUID` | REFERENCES public.campaigns(id) ON DELETE CASCADE | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `error_message` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Unreferenced in static queries |
| `meta_message_id` | `TEXT` | - | Used |
| `phone_number` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'queued' | Used |
| `timestamp` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `campaign_id` &rarr; `public.campaigns(id)`
- `lead_id` &rarr; `public.leads(id)`
- `campaign_id` &rarr; `public.campaigns(id)`
- `lead_id` &rarr; `public.leads(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow ALL on campaign_logs` | `ALL` | `authenticated` | `true` | `-` |

---

### `campaigns`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql, supabase/whatsapp_campaigns.sql`

**Code References:**
- **Reads (4):** `src/app/api/campaigns/queue/route.ts`, `src/app/dashboard/owner/MarketingSection.tsx`, `src/app/dashboard/owner/campaigns/[id]/page.tsx`, `src/app/dashboard/owner/campaigns/page.tsx`
- **Writes (1):** `src/app/api/campaigns/queue/route.ts`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `audience_filter` | `JSONB` | - | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `name` | `TEXT` | NOT NULL | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `status` | `TEXT` | DEFAULT 'queued' | Used |
| `template_name` | `TEXT` | NOT NULL | Used |
| `total_delivered` | `INTEGER` | DEFAULT 0 | Unreferenced in static queries |
| `total_read` | `INTEGER` | DEFAULT 0 | Unreferenced in static queries |
| `total_recipients` | `INTEGER` | DEFAULT 0 | Used |
| `total_replies` | `INTEGER` | DEFAULT 0 | Unreferenced in static queries |
| `total_sent` | `INTEGER` | DEFAULT 0 | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow ALL on campaigns` | `ALL` | `authenticated` | `true` | `-` |

---

### `conversations`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql`

**Code References:**
- **Reads (2):** `src/app/api/webhooks/whatsapp/route.ts`, `src/app/dashboard/owner/whatsapp/inbox/page.tsx`
- **Writes (1):** `src/app/api/webhooks/whatsapp/route.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `last_message_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `lead_id` &rarr; `public.leads(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `employee_attendance`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/add_employee_tables.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/owner/employees-actions.ts`
- **Writes (1):** `src/app/dashboard/owner/employees-actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE DEFAULT NOW() | Unreferenced in static queries |
| `date` | `DATE` | NOT NULL DEFAULT CURRENT_DATE | Used |
| `employee_id` | `UUID` | REFERENCES public.property_employees(id) ON DELETE CASCADE | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `time_in` | `TIMESTAMP` | WITH TIME ZONE | Used |
| `time_out` | `TIMESTAMP` | WITH TIME ZONE | Used |

**Foreign Keys:**

- `employee_id` &rarr; `public.property_employees(id)`
- `owner_id` &rarr; `public.owners(id)`
- `employee_id` &rarr; `public.property_employees(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Owners can view their employees attendance` | `SELECT` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |
| `Owners can insert their employees attendance` | `INSERT` | `PUBLIC` | `-` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` |
| `Owners can update their employees attendance` | `UPDATE` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `guest_checkins`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (7):** `src/app/api/admin/sync-drive/route.ts`, `src/app/checkin/actions.ts`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/profile/page.tsx`, `src/app/dashboard/police/page.tsx` *(and 2 more)*
- **Writes (2):** `src/app/checkin/actions.ts`, `src/app/dashboard/owner/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `booking_id` | `UUID` | REFERENCES public.bookings(id) ON DELETE SET NULL | Unreferenced in static queries |
| `checkin_date` | `DATE` | - | Unreferenced in static queries |
| `checkout_date` | `DATE` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `form_c_details` | `JSONB` | - | Unreferenced in static queries |
| `guest_name` | `TEXT` | NOT NULL | Used |
| `guest_phone` | `TEXT` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `id_documents` | `JSONB` | DEFAULT '[]'::jsonb | Used |
| `num_people` | `INTEGER` | NOT NULL | Unreferenced in static queries |
| `organization_id` | `UUID` | REFERENCES public.organizations(id) ON DELETE SET NULL | Unreferenced in static queries |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `register_date` | `DATE` | - | Unreferenced in static queries |
| `register_image_url` | `TEXT` | - | Unreferenced in static queries |
| `room_number` | `TEXT` | - | Used |
| `source` | `TEXT` | DEFAULT 'guest_form' | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'draft' | Used |
| `uid` | `VARCHAR(20)` | UNIQUE | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE SET NULL | Unreferenced in static queries |
| `vehicle_number` | `TEXT` | - | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `owner_id` &rarr; `public.owners(id)`
- `user_id` &rarr; `public.auth(id)`
- `booking_id` &rarr; `public.bookings(id)`
- `organization_id` &rarr; `public.organizations(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Anyone can submit guest checkins` | `INSERT` | `PUBLIC` | `-` | `(user_id = auth.uid() OR user_id IS NULL) AND
    (booking_id IS NULL OR booking...` |
| `Guests can view own checkins` | `SELECT` | `PUBLIC` | `user_id = auth.uid()` | `-` |
| `Owners can view checkins for their properties` | `SELECT` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |
| `Owners can update checkins for their properties` | `UPDATE` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `guest_hub_payments`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (1):** `src/app/actions/guest-hub.ts`
- **Writes (1):** `src/app/actions/guest-hub.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `email` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `months_count` | `INTEGER` | NOT NULL DEFAULT 1 | Unreferenced in static queries |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE SET NULL | Used |
| `price_per_room` | `NUMERIC` | NOT NULL DEFAULT 20 | Unreferenced in static queries |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE SET NULL | Used |
| `razorpay_order_id` | `TEXT` | UNIQUE | Unreferenced in static queries |
| `razorpay_payment_id` | `TEXT` | - | Used |
| `rooms_count` | `INTEGER` | NOT NULL | Unreferenced in static queries |
| `status` | `TEXT` | NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')) | Used |
| `total_amount` | `NUMERIC` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `guest_hub_platform_settings`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (1):** `src/app/actions/guest-hub.ts`
- **Writes (1):** `src/app/actions/guest-hub.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY DEFAULT 'default' | Unreferenced in static queries |
| `price_per_room_monthly` | `NUMERIC` | NOT NULL DEFAULT 20 | Used |
| `product_name` | `TEXT` | NOT NULL DEFAULT 'Guest Hub' | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `guest_hub_settings`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (7):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/admin/properties/[id]/page.tsx`, `src/app/dashboard/owner/page.tsx` *(and 2 more)*
- **Writes (2):** `src/app/actions/guest-hub.ts`, `src/lib/guest-hub/db-adapter.ts`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `bill_settings` | `JSONB` | NOT NULL DEFAULT '{"gst_number": "" | Unreferenced in static queries |
| `branding` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Used |
| `country_code` | `TEXT` | NOT NULL DEFAULT '91' | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `departments` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `emergency_contacts` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `house_info` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `hub_status` | `TEXT` | NOT NULL DEFAULT 'active' CHECK (hub_status IN ('active', 'paused', 'removed')) | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `local_guide` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `menu` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `paid_rooms_limit` | `INTEGER` | NOT NULL DEFAULT 0 | Used |
| `plan_features` | `JSONB` | NOT NULL DEFAULT '{"phase1": true | Unreferenced in static queries |
| `policies` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `request_items` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `services` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `slug` | `TEXT` | NOT NULL UNIQUE | Unreferenced in static queries |
| `subscription_end_date` | `TIMESTAMPTZ` | - | Used |
| `subscription_start_date` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `subscription_status` | `TEXT` | NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired')) | Used |
| `timezone` | `TEXT` | NOT NULL DEFAULT 'Asia/Kolkata' | Unreferenced in static queries |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow read for realtime on guest_hub_settings` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `guest_identity`
**Defined in:** `supabase/guest_identity.sql`

**Code References:**
- **Reads (5):** `src/app/checkin/actions.ts`, `src/app/checkin/verify-action.ts`, `src/app/dashboard/owner/actions.ts`, `src/app/police/actions.ts`, `src/lib/google-drive.ts`
- **Writes (3):** `src/app/checkin/actions.ts`, `src/app/checkin/verify-action.ts`, `src/app/dashboard/owner/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `back_image_url` | `TEXT` | - | Unreferenced in static queries |
| `checkin_id` | `UUID` | REFERENCES public.guest_checkins(id) ON DELETE CASCADE | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `date_of_birth` | `TEXT` | - | Used |
| `document_confidence` | `NUMERIC` | - | Unreferenced in static queries |
| `document_image_url` | `TEXT` | - | Used |
| `document_number` | `TEXT` | - | Used |
| `document_thumbnail` | `TEXT` | - | Unreferenced in static queries |
| `document_type` | `govt_document_type` | DEFAULT 'UNKNOWN' | Used |
| `full_name` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `is_verified` | `BOOLEAN` | DEFAULT FALSE | Used |
| `ocr_json` | `JSONB` | - | Unreferenced in static queries |
| `raw_ocr_text` | `TEXT` | - | Unreferenced in static queries |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `verification_reason` | `TEXT` | - | Used |
| `verification_status` | `verification_status_type` | DEFAULT 'PENDING' | Used |

**Foreign Keys:**

- `checkin_id` &rarr; `public.guest_checkins(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_bills`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `bill_number` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `bill_type` | `TEXT` | NOT NULL CHECK (bill_type IN ('room', 'table', 'takeaway')) | Unreferenced in static queries |
| `cancel_reason` | `TEXT` | - | Unreferenced in static queries |
| `cancelled_by` | `TEXT` | - | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `customer_name` | `TEXT` | - | Unreferenced in static queries |
| `customer_phone` | `TEXT` | - | Unreferenced in static queries |
| `gst_amount` | `NUMERIC` | NOT NULL DEFAULT 0 | Unreferenced in static queries |
| `gst_rate` | `NUMERIC` | NOT NULL DEFAULT 5 | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `items` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `status` | `TEXT` | NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')) | Unreferenced in static queries |
| `stay_id` | `UUID` | REFERENCES public.hub_stays(id) ON DELETE SET NULL | Unreferenced in static queries |
| `subtotal` | `NUMERIC` | NOT NULL DEFAULT 0 | Unreferenced in static queries |
| `table_id` | `UUID` | REFERENCES public.hub_tables(id) ON DELETE SET NULL | Unreferenced in static queries |
| `total` | `NUMERIC` | NOT NULL DEFAULT 0 | Unreferenced in static queries |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `stay_id` &rarr; `public.hub_stays(id)`
- `table_id` &rarr; `public.hub_tables(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_event_logs`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (1):** `src/app/actions/guest-hub.ts`
- **Writes (1):** `src/app/actions/guest-hub.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `actor_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `actor_role` | `TEXT` | - | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `description` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `event_type` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `metadata` | `JSONB` | DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_messages`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `read_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `room_id` | `UUID` | NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE | Unreferenced in static queries |
| `sender_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `sender_type` | `TEXT` | NOT NULL CHECK (sender_type IN ('guest', 'staff')) | Unreferenced in static queries |
| `sent_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Unreferenced in static queries |
| `staff_id` | `UUID` | REFERENCES public.hub_staff_users(id) ON DELETE SET NULL | Unreferenced in static queries |
| `stay_id` | `UUID` | NOT NULL REFERENCES public.hub_stays(id) ON DELETE CASCADE | Unreferenced in static queries |
| `text` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `stay_id` &rarr; `public.hub_stays(id)`
- `room_id` &rarr; `public.property_rooms(id)`
- `staff_id` &rarr; `public.hub_staff_users(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_offers`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `details` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Unreferenced in static queries |
| `price` | `NUMERIC` | - | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `title` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_payments`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `amount` | `NUMERIC` | NOT NULL | Unreferenced in static queries |
| `bill_id` | `UUID` | NOT NULL REFERENCES public.hub_bills(id) ON DELETE CASCADE | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `mode` | `TEXT` | NOT NULL CHECK (mode IN ('cash', 'upi', 'card')) | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `taken_by` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `bill_id` &rarr; `public.hub_bills(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_requests`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (1):** `src/app/actions/guest-hub.ts`
- **Writes (1):** `src/app/actions/guest-hub.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `accepted_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `accepted_by` | `TEXT` | - | Unreferenced in static queries |
| `bill_id` | `UUID` | - | Unreferenced in static queries |
| `completed_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `completed_by` | `TEXT` | - | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `decline_reason` | `TEXT` | - | Unreferenced in static queries |
| `declined_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `declined_by` | `TEXT` | - | Unreferenced in static queries |
| `department` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `details` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `guest_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `items` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `note` | `TEXT` | - | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `room_id` | `UUID` | NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE | Unreferenced in static queries |
| `room_number` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `seen_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `seen_by` | `TEXT` | - | Unreferenced in static queries |
| `service` | `TEXT` | NOT NULL | Used |
| `status_history` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | Unreferenced in static queries |
| `stay_id` | `UUID` | NOT NULL REFERENCES public.hub_stays(id) ON DELETE CASCADE | Unreferenced in static queries |
| `total` | `NUMERIC` | NOT NULL DEFAULT 0 | Unreferenced in static queries |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `stay_id` &rarr; `public.hub_stays(id)`
- `room_id` &rarr; `public.property_rooms(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow read for realtime on hub_requests` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `hub_staff_users`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (2):** `src/app/actions/guest-hub.ts`, `src/lib/guest-hub/db-adapter.ts`
- **Writes (2):** `src/app/actions/guest-hub.ts`, `src/lib/guest-hub/db-adapter.ts`
- **Deletes (1):** `src/app/actions/guest-hub.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `departments` | `TEXT[]` | NOT NULL DEFAULT ARRAY[]::TEXT[] | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Used |
| `login_id` | `TEXT` | NOT NULL | Used |
| `name` | `TEXT` | NOT NULL | Used |
| `password_hash` | `TEXT` | NOT NULL | Used |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `role` | `TEXT` | NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'kitchen')) | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `hub_stays`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- **Reads (4):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/police/page.tsx`, `src/lib/guest-hub/db-adapter.ts`
- **Writes (3):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/owner/actions.ts`, `src/lib/guest-hub/db-adapter.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `access_ends_at` | `TIMESTAMPTZ` | NOT NULL | Used |
| `checkin_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `created_by` | `TEXT` | - | Unreferenced in static queries |
| `ended_at` | `TIMESTAMPTZ` | - | Used |
| `ended_by` | `TEXT` | - | Used |
| `failed_pin_attempts` | `INTEGER` | NOT NULL DEFAULT 0 | Used |
| `food_ordering_allowed` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Unreferenced in static queries |
| `guest_checkin_id` | `UUID` | REFERENCES public.guest_checkins(id) ON DELETE SET NULL | Unreferenced in static queries |
| `guest_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `guest_phone` | `TEXT` | - | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `pin_code` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `pin_locked_until` | `TIMESTAMPTZ` | - | Used |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `room_id` | `UUID` | NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE | Unreferenced in static queries |
| `selected_offer_ids` | `UUID[]` | DEFAULT ARRAY[]::UUID[] | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `room_id` &rarr; `public.property_rooms(id)`
- `guest_checkin_id` &rarr; `public.guest_checkins(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow read for realtime on hub_stays` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `hub_tables`
**Defined in:** `supabase/migrations/20261011000000_guest_hub_foundation.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Unreferenced in static queries |
| `property_id` | `UUID` | NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `table_name` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `influencer_clicks`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/admin/page.tsx`
- **Writes (1):** `src/app/guest/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `influencer_id` | `UUID` | REFERENCES public.influencers(id) ON DELETE CASCADE | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `timestamp` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `influencer_id` &rarr; `public.influencers(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Anyone can log influencer clicks` | `INSERT` | `PUBLIC` | `-` | `true` |
| `Influencers can view own clicks` | `SELECT` | `PUBLIC` | `influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() O...` | `-` |

---

### `influencer_links`
**Defined in:** `supabase/autowala_migration.sql`

**Code References:**
- **Reads (3):** `src/app/dashboard/agent/actions.ts`, `src/app/dashboard/agent/page.tsx`, `src/app/guest/property/[id]/actions.ts`
- **Writes (2):** `src/app/dashboard/agent/actions.ts`, `src/app/guest/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `booking_id` | `UUID` | REFERENCES public.bookings(id) ON DELETE SET NULL | Used |
| `commission_earned` | `NUMERIC` | DEFAULT 0 | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `customer_name` | `TEXT` | - | Used |
| `customer_phone` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `influencer_id` | `UUID` | REFERENCES public.influencers(id) ON DELETE CASCADE | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `status` | `TEXT` | DEFAULT 'sent' | Used |

**Foreign Keys:**

- `influencer_id` &rarr; `public.influencers(id)`
- `property_id` &rarr; `public.properties(id)`
- `booking_id` &rarr; `public.bookings(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow ALL on influencer_links for authenticated` | `ALL` | `authenticated` | `true` | `-` |

---

### `influencer_promotion_requests`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/influencer_requests.sql`

**Code References:**
- **Reads (3):** `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/influencer/influencer-requests-actions.ts`, `src/app/dashboard/owner/actions.ts`
- **Writes (1):** `src/app/dashboard/influencer/influencer-requests-actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `influencer_id` | `UUID` | - | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `proposal_text` | `TEXT` | NOT NULL | Used |
| `rejection_reason` | `TEXT` | - | Used |
| `status` | `TEXT` | DEFAULT 'pending' | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |

**Foreign Keys:**

- `influencer_id` &rarr; `public.influencers(id)`
- `property_id` &rarr; `public.properties(id)`
- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Influencers can view own requests` | `SELECT` | `PUBLIC` | `auth.uid() IN (SELECT user_id FROM public.influencers WHERE id = influencer_id)` | `-` |
| `Influencers can create requests` | `INSERT` | `PUBLIC` | `-` | `auth.uid() IN (SELECT user_id FROM public.influencers WHERE id = influencer_id)` |
| `Owners can view requests for their properties` | `SELECT` | `PUBLIC` | `auth.uid() IN (SELECT user_id FROM public.owners o JOIN public.properties p ON p...` | `-` |
| `Owners can update requests` | `UPDATE` | `PUBLIC` | `auth.uid() IN (SELECT user_id FROM public.owners o JOIN public.properties p ON p...` | `-` |
| `Admins can view all requests` | `SELECT` | `PUBLIC` | `((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
    OR (((select au...` | `-` |

---

### `influencer_properties`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/admin/page.tsx`
- **Writes (1):** `src/app/dashboard/admin/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `influencer_id` | `UUID` | REFERENCES public.influencers(id) ON DELETE CASCADE | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `influencer_id` &rarr; `public.influencers(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Influencers can view assigned properties` | `SELECT` | `PUBLIC` | `influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() O...` | `-` |

---

### `influencers`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (7):** `src/app/auth/callback/route.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/agent/page.tsx`, `src/app/dashboard/influencer/influencer-requests-actions.ts`, `src/app/dashboard/influencer/page.tsx` *(and 2 more)*
- **Writes (5):** `src/app/auth/callback/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/influencer/influencer-requests-actions.ts`, `src/app/dashboard/influencer/page.tsx`, `src/app/login/actions.ts`
- **Deletes (3):** `src/app/actions/delete-account.ts`, `src/app/dashboard/admin/actions.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `approved` | `BOOLEAN` | DEFAULT FALSE | Used |
| `commission_rate` | `NUMERIC` | DEFAULT 10 | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `email` | `TEXT` | UNIQUE NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `name` | `TEXT` | NOT NULL | Used |
| `payout_details` | `JSONB` | DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `type` | `TEXT` | DEFAULT 'standard' | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `user_id` &rarr; `public.auth(id)`
- `user_id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Influencers can view own profile` | `SELECT` | `PUBLIC` | `user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.ui...` | `-` |
| `Influencers can update own profile` | `UPDATE` | `PUBLIC` | `user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.ui...` | `-` |

---

### `lead_notes`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `content` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Unreferenced in static queries |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Unreferenced in static queries |

**Foreign Keys:**

- `lead_id` &rarr; `public.leads(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `lead_tags`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Unreferenced in static queries |
| `tag_name` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `lead_id` &rarr; `public.leads(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `leads`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (6):** `src/app/api/campaigns/queue/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`, `src/app/dashboard/owner/MarketingSection.tsx`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/campaigns/create/page.tsx` *(and 1 more)*
- **Writes (4):** `src/app/api/webhooks/whatsapp/route.ts`, `src/app/dashboard/owner/leads-actions.ts`, `src/app/dashboard/owner/leads/import/page.tsx`, `src/app/guest/property/[id]/actions.ts`
- **Deletes (2):** `src/app/dashboard/owner/leads-actions.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `checkin_date` | `DATE` | - | Unreferenced in static queries |
| `checkout_date` | `DATE` | - | Unreferenced in static queries |
| `city` | `TEXT` | - | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `email` | `TEXT` | - | Unreferenced in static queries |
| `guest_name` | `TEXT` | - | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `marking` | `TEXT` | DEFAULT 'Warm' | Unreferenced in static queries |
| `name` | `TEXT` | - | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `phone_number` | `TEXT` | NOT NULL | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `source` | `TEXT` | DEFAULT 'Manual' | Used |
| `status` | `TEXT` | DEFAULT 'Enquired' | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `property_id` &rarr; `public.properties(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Anyone can submit leads` | `INSERT` | `PUBLIC` | `-` | `true` |
| `Owners can view and manage leads for their properties` | `ALL` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `message_queue`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql`

**Code References:**
- **Writes (2):** `src/app/api/campaigns/queue/route.ts`, `src/app/dashboard/owner/whatsapp/inbox/page.tsx`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `campaign_id` | `UUID` | REFERENCES public.campaigns(id) ON DELETE CASCADE | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `error` | `TEXT` | - | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `payload` | `JSONB` | NOT NULL | Used |
| `processed_at` | `TIMESTAMPTZ` | - | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'pending' | Used |
| `type` | `TEXT` | DEFAULT 'template' | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `campaign_id` &rarr; `public.campaigns(id)`
- `lead_id` &rarr; `public.leads(id)`

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `messages`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql, supabase/police_owner_messages.sql`

**Code References:**
- **Reads (2):** `src/app/dashboard/messages/actions.ts`, `src/app/dashboard/owner/whatsapp/inbox/page.tsx`
- **Writes (3):** `src/app/api/webhooks/whatsapp/route.ts`, `src/app/dashboard/messages/actions.ts`, `src/app/dashboard/owner/whatsapp/inbox/page.tsx`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `content` | `TEXT` | - | Used |
| `conversation_id` | `UUID` | REFERENCES public.conversations(id) ON DELETE CASCADE | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `direction` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `is_read` | `BOOLEAN` | NOT NULL DEFAULT false | Used |
| `lead_id` | `UUID` | REFERENCES public.leads(id) ON DELETE CASCADE | Unreferenced in static queries |
| `media_url` | `TEXT` | - | Unreferenced in static queries |
| `meta_message_id` | `TEXT` | UNIQUE | Unreferenced in static queries |
| `owner_id` | `UUID` | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE | Used |
| `sender_type` | `TEXT` | NOT NULL CHECK (sender_type IN ('police', 'owner')) | Used |
| `status` | `TEXT` | DEFAULT 'sent' | Used |
| `type` | `TEXT` | NOT NULL | Unreferenced in static queries |

**Foreign Keys:**

- `owner_id` &rarr; `public.auth(id)`
- `conversation_id` &rarr; `public.conversations(id)`
- `lead_id` &rarr; `public.leads(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Police can view all messages` | `SELECT` | `PUBLIC` | `((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police')` | `-` |
| `Police can insert messages` | `INSERT` | `PUBLIC` | `-` | `(((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police'))
    AND sender_t...` |
| `Police can update messages` | `UPDATE` | `PUBLIC` | `((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police')` | `-` |
| `Owners can view their own messages` | `SELECT` | `PUBLIC` | `auth.uid() = owner_id` | `-` |
| `Owners can insert their own messages` | `INSERT` | `PUBLIC` | `-` | `auth.uid() = owner_id
        AND sender_type = 'owner'` |
| `Owners can update their own messages` | `UPDATE` | `PUBLIC` | `auth.uid() = owner_id` | `-` |

---

### `ocr_cache`
**Defined in:** `supabase/migrations/20260807000000_create_ocr_cache.sql`

**Code References:**
- **Reads (2):** `src/app/checkin/verify-action.ts`, `src/app/dashboard/owner/employee-verify-action.ts`
- **Writes (2):** `src/app/checkin/verify-action.ts`, `src/app/dashboard/owner/employee-verify-action.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `document_type` | `TEXT` | - | Used |
| `image_hash` | `TEXT` | PRIMARY KEY | Used |
| `ocr_json` | `JSONB` | NOT NULL | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

- *No RLS policies explicitly defined in repository SQL.*

---

### `organizations`
**Defined in:** `supabase/white_label_architecture.sql`

**Code References:**
- **Reads (4):** `src/app/api/v1/checkin/route.ts`, `src/app/client/[slug]/page.tsx`, `src/app/dashboard/admin/org-actions.ts`, `src/app/dashboard/admin/page.tsx`
- **Writes (1):** `src/app/dashboard/admin/org-actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `api_key` | `UUID` | UNIQUE DEFAULT uuid_generate_v4() | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `logo_url` | `TEXT` | - | Used |
| `name` | `TEXT` | NOT NULL | Used |
| `primary_color` | `TEXT` | DEFAULT '#2563EB' | Used |
| `slug` | `TEXT` | UNIQUE NOT NULL | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Organizations are viewable by everyone` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `owner_google_tokens`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/migrations/20260701010000_add_owner_google_drive.sql`

**Code References:**
- **Reads (5):** `src/app/api/admin/sync-drive/route.ts`, `src/app/api/debug/inspect-drive/route.ts`, `src/app/dashboard/owner/page.tsx`, `src/app/dashboard/owner/profile/page.tsx`, `src/lib/google-drive.ts`
- **Writes (2):** `src/app/api/auth/google/callback/route.ts`, `src/lib/google-drive.ts`
- **Deletes (2):** `src/app/api/auth/google/disconnect/route.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `access_token` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `expiry_date` | `TIMESTAMPTZ` | NOT NULL | Used |
| `google_email` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Unreferenced in static queries |
| `owner_id` | `UUID` | PRIMARY KEY REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `refresh_token` | `TEXT` | NOT NULL | Used |
| `root_folder_id` | `TEXT` | - | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Owners can view their own google tokens` | `SELECT` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners...` | `-` |
| `Owners can insert their own google tokens` | `INSERT` | `PUBLIC` | `-` | `EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners...` |
| `Owners can update their own google tokens` | `UPDATE` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners...` | `-` |
| `Owners can delete their own google tokens` | `DELETE` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners...` | `-` |

---

### `owner_payments`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/subscriptions.sql, supabase/razorpay_migration.sql`

**Code References:**
- **Reads (3):** `src/app/api/admin/repair/route.ts`, `src/app/dashboard/owner/profile/page.tsx`, `src/app/pricing/business/actions.ts`
- **Writes (3):** `src/app/api/admin/repair/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/pricing/business/actions.ts`
- **Deletes (2):** `src/app/api/admin/repair/route.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `amount` | `NUMERIC` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `email` | `TEXT` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `payment_date` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `payment_method` | `TEXT` | - | Used |
| `payment_ref` | `TEXT` | - | Used |
| `plan_duration_months` | `INTEGER` | NOT NULL | Used |
| `plan_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `razorpay_order_id` | `TEXT` | - | Used |
| `razorpay_payment_id` | `TEXT` | - | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'success' | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Admins can view owner payments` | `SELECT` | `PUBLIC` | `((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
    OR ((select aut...` | `-` |
| `Admins manage owner_payments` | `ALL` | `authenticated` | `auth.jwt() ->> 'email' = 'superadmin@fixstay.com'` | `-` |
| `Owners view their own payments` | `SELECT` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `owner_subscriptions`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/subscriptions.sql`

**Code References:**
- **Reads (11):** `src/app/api/admin/repair/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/admin/properties/[id]/page.tsx`, `src/app/dashboard/owner/actions.ts` *(and 6 more)*
- **Writes (5):** `src/app/api/admin/repair/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/owner/actions.ts`, `src/app/pricing/business/actions.ts`, `src/utils/subscription-reminders.ts`
- **Deletes (2):** `src/app/api/admin/repair/route.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `end_date` | `TIMESTAMPTZ` | DEFAULT NOW() + INTERVAL '1 month' | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `plan_name` | `TEXT` | DEFAULT 'starter' | Used |
| `start_date` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `status` | `TEXT` | DEFAULT 'active' | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Admins manage subscriptions` | `ALL` | `authenticated` | `auth.jwt() ->> 'email' = 'superadmin@fixstay.com'` | `-` |
| `Owners view their own subscriptions` | `SELECT` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `owners`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (31):** `src/app/actions/delete-account.ts`, `src/app/actions/guest-hub.ts`, `src/app/actions/property.ts`, `src/app/api/admin/repair/route.ts`, `src/app/api/auth/google/callback/route.ts` *(and 26 more)*
- **Writes (15):** `src/app/actions/guest-hub.ts`, `src/app/actions/property.ts`, `src/app/api/admin/repair/route.ts`, `src/app/auth/callback/route.ts`, `src/app/dashboard/admin/actions.ts` *(and 10 more)*
- **Deletes (3):** `src/app/actions/delete-account.ts`, `src/app/api/admin/repair/route.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `email` | `TEXT` | UNIQUE NOT NULL | Used |
| `free_tier_enabled` | `BOOLEAN` | DEFAULT false | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `is_active_member` | `BOOLEAN` | DEFAULT FALSE | Unreferenced in static queries |
| `name` | `TEXT` | NOT NULL | Used |
| `payout_details` | `JSONB` | DEFAULT '{}'::jsonb | Unreferenced in static queries |
| `phone` | `TEXT` | - | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) | Used |

**Foreign Keys:**

- `user_id` &rarr; `public.auth(id)`
- `user_id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Owners can view own profile` | `SELECT` | `PUBLIC` | `auth.uid() = user_id` | `-` |
| `Owners can update own profile` | `UPDATE` | `PUBLIC` | `auth.uid() = user_id` | `-` |
| `Owners can insert own profile` | `INSERT` | `PUBLIC` | `-` | `auth.uid() = user_id` |
| `Owners can view own record` | `SELECT` | `PUBLIC` | `(select auth.uid()) = user_id
    OR email = ((select auth.jwt()) ->> 'email')
 ...` | `-` |
| `Owners can update own record` | `UPDATE` | `PUBLIC` | `user_id = (SELECT auth.uid())` | `-` |
| `Users can link themselves to existing owner records` | `UPDATE` | `PUBLIC` | `user_id IS NULL` | `user_id = (SELECT auth.uid())` |

---

### `payout_requests`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/fix_influencer_dashboard.sql, supabase/wallet_migrations.sql`

**Code References:**
- **Reads (4):** `src/app/actions/wallet.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/owner/actions.ts`
- **Writes (2):** `src/app/actions/wallet.ts`, `src/app/dashboard/admin/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `amount` | `NUMERIC` | NOT NULL | Used |
| `bank_details` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `notes` | `TEXT` | - | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'pending' | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `user_id` &rarr; `public.auth(id)`
- `user_id` &rarr; `public.auth(id)`
- `user_id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Users can view their own payout requests` | `SELECT` | `PUBLIC` | `user_id = (SELECT auth.uid())` | `-` |
| `Users can insert their own payout requests` | `INSERT` | `PUBLIC` | `-` | `user_id = (SELECT auth.uid())` |
| `Admins can manage all payout requests` | `ALL` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() A...` | `-` |

---

### `profiles`
**Defined in:** `supabase/profile_schema.sql`

**Code References:**
- **Reads (1):** `src/app/guest/profile/actions.ts`
- **Writes (1):** `src/app/guest/profile/actions.ts`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `avatar_url` | `TEXT` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `email` | `TEXT` | UNIQUE | Used |
| `full_name` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE | Used |
| `phone` | `TEXT` | - | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |

**Foreign Keys:**

- `id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Users can view own profile` | `SELECT` | `PUBLIC` | `auth.uid() = id` | `-` |
| `Users can update own profile` | `UPDATE` | `PUBLIC` | `auth.uid() = id` | `-` |
| `Users can insert own profile` | `INSERT` | `PUBLIC` | `-` | `auth.uid() = id` |

---

### `properties`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (28):** `src/app/actions/guest-hub.ts`, `src/app/actions/property.ts`, `src/app/api/admin/repair/route.ts`, `src/app/api/v1/checkin/route.ts`, `src/app/checkin/actions.ts` *(and 23 more)*
- **Writes (14):** `src/app/actions/guest-hub.ts`, `src/app/actions/property.ts`, `src/app/api/admin/repair/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/org-actions.ts` *(and 9 more)*
- **Deletes (5):** `src/app/api/admin/repair/route.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/owner/actions.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `address` | `TEXT` | - | Unreferenced in static queries |
| `amenities` | `TEXT[]` | - | Used |
| `approved` | `BOOLEAN` | DEFAULT FALSE | Used |
| `area_name` | `TEXT` | - | Used |
| `city` | `TEXT` | - | Used |
| `city_area` | `TEXT` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `description` | `TEXT` | - | Used |
| `helpdesk_number` | `TEXT` | - | Used |
| `house_rules` | `TEXT` | - | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `image_url` | `TEXT` | - | Used |
| `is_guest_hub_only` | `BOOLEAN` | DEFAULT FALSE | Used |
| `latitude` | `NUMERIC` | - | Unreferenced in static queries |
| `longitude` | `NUMERIC` | - | Unreferenced in static queries |
| `name` | `TEXT` | NOT NULL | Used |
| `organization_id` | `UUID` | REFERENCES public.organizations(id) ON DELETE SET NULL | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `slug` | `TEXT` | UNIQUE | Used |
| `type` | `TEXT` | NOT NULL | Used |
| `uid` | `VARCHAR(20)` | UNIQUE | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `organization_id` &rarr; `public.organizations(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Public can view approved properties` | `SELECT` | `PUBLIC` | `approved = true` | `-` |
| `Owners can view all their properties` | `SELECT` | `PUBLIC` | `owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())` | `-` |
| `Owners can insert their properties` | `INSERT` | `PUBLIC` | `-` | `owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())` |
| `Owners can update their properties` | `UPDATE` | `PUBLIC` | `owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())` | `-` |
| `Owners can delete their properties` | `DELETE` | `PUBLIC` | `owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())` | `-` |
| `Owners can manage own properties` | `ALL` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `property_employees`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/add_employee_tables.sql`

**Code References:**
- **Reads (2):** `src/app/dashboard/owner/employees-actions.ts`, `src/app/dashboard/police/page.tsx`
- **Writes (2):** `src/app/dashboard/owner/employees-actions.ts`, `src/app/dashboard/police/police-actions.ts`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `attendance_pin` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE DEFAULT NOW() | Unreferenced in static queries |
| `date_of_birth` | `TEXT` | - | Unreferenced in static queries |
| `first_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `govt_verification_id` | `TEXT` | - | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `last_name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `mobile_number` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `permanent_address` | `TEXT` | - | Unreferenced in static queries |
| `property_address` | `TEXT` | - | Unreferenced in static queries |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Unreferenced in static queries |
| `role` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'active' CHECK (status IN ('active', 'fired')) | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `owner_id` &rarr; `public.owners(id)`
- `property_id` &rarr; `public.properties(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Owners can view their own employees` | `SELECT` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |
| `Owners can insert their own employees` | `INSERT` | `PUBLIC` | `-` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` |
| `Owners can update their own employees` | `UPDATE` | `PUBLIC` | `owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.ui...` | `-` |

---

### `property_owner_leads`
**Defined in:** `supabase/owner_leads.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/admin/page.tsx`
- **Writes (1):** `src/app/owner-contact/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `area` | `TEXT` | NOT NULL | Used |
| `city` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL | Used |
| `full_name` | `TEXT` | NOT NULL | Used |
| `google_link` | `TEXT` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `phone` | `TEXT` | NOT NULL | Used |
| `status` | `TEXT` | DEFAULT 'pending' | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow public insert to property_owner_leads` | `INSERT` | `public` | `-` | `true` |
| `Allow admin to manage property_owner_leads` | `ALL` | `authenticated` | `auth.jwt() ->> 'email' = 'superadmin@fixstay.com'` | `-` |

---

### `property_rooms`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/add_room_numbers.sql`

**Code References:**
- **Reads (6):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/admin/properties/[id]/page.tsx`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/property/[id]/edit/page.tsx`, `src/components/EditPropertyForm.tsx` *(and 1 more)*
- **Writes (3):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/owner/actions.ts`, `src/lib/guest-hub/db-adapter.ts`
- **Deletes (3):** `src/app/actions/guest-hub.ts`, `src/app/dashboard/owner/actions.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |
| `qr_token` | `TEXT` | UNIQUE | Used |
| `room_name` | `TEXT` | - | Unreferenced in static queries |
| `room_number` | `TEXT` | NOT NULL | Used |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`
- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Owners can manage rooms for their properties` | `ALL` | `authenticated` | `property_id IN (
      SELECT p.id FROM public.properties p 
      WHERE p.owner...` | `-` |

---

### `room_availability`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (2):** `src/app/dashboard/owner/property/[id]/actions.ts`, `src/app/dashboard/owner/property/[id]/page.tsx`
- **Writes (1):** `src/app/dashboard/owner/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `available` | `BOOLEAN` | DEFAULT TRUE | Used |
| `date` | `DATE` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `room_id` | `UUID` | REFERENCES public.rooms(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `room_id` &rarr; `public.rooms(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Public can view availability of approved property rooms` | `SELECT` | `PUBLIC` | `room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.proper...` | `-` |
| `Owners can manage availability for their rooms` | `ALL` | `PUBLIC` | `room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.proper...` | `-` |

---

### `room_rates`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/owner/property/[id]/page.tsx`
- **Writes (1):** `src/app/dashboard/owner/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `date` | `DATE` | NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `price` | `NUMERIC` | NOT NULL | Used |
| `room_id` | `UUID` | REFERENCES public.rooms(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `room_id` &rarr; `public.rooms(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Public can view rates of approved property rooms` | `SELECT` | `PUBLIC` | `room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.proper...` | `-` |
| `Owners can manage rates for their rooms` | `ALL` | `PUBLIC` | `room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.proper...` | `-` |

---

### `rooms`
**Defined in:** `supabase/schema.sql`

**Code References:**
- **Reads (7):** `src/app/actions/property.ts`, `src/app/dashboard/admin/actions.ts`, `src/app/dashboard/admin/properties/[id]/page.tsx`, `src/app/dashboard/owner/property/[id]/actions.ts`, `src/app/dashboard/owner/property/[id]/edit/page.tsx` *(and 2 more)*
- **Writes (5):** `src/app/actions/property.ts`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/property/[id]/actions.ts`, `src/app/onboarding/actions.ts`, `src/app/pricing/business/actions.ts`
- **Deletes (3):** `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/property/[id]/actions.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `base_capacity` | `INTEGER` | DEFAULT 2 | Used |
| `base_price` | `NUMERIC` | NOT NULL | Used |
| `category` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `extra_guest_price` | `NUMERIC` | DEFAULT 500 | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `image_url` | `TEXT` | - | Used |
| `max_capacity` | `INTEGER` | DEFAULT 4 | Used |
| `name` | `TEXT` | NOT NULL | Used |
| `price_bucket` | `TEXT` | - | Used |
| `property_id` | `UUID` | REFERENCES public.properties(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `property_id` &rarr; `public.properties(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Public can view rooms of approved properties` | `SELECT` | `PUBLIC` | `property_id IN (SELECT id FROM public.properties WHERE approved = true)` | `-` |
| `Owners can view rooms of their properties` | `SELECT` | `PUBLIC` | `property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FR...` | `-` |
| `Owners can insert rooms for their properties` | `INSERT` | `PUBLIC` | `-` | `property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FR...` |
| `Owners can update rooms of their properties` | `UPDATE` | `PUBLIC` | `property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FR...` | `-` |
| `Owners can delete rooms of their properties` | `DELETE` | `PUBLIC` | `property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FR...` | `-` |

---

### `seo_landmarks`
**Defined in:** `supabase/seo_schema.sql`

**Code References:**
- *Unused in codebase*

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `city_slug` | `TEXT` | REFERENCES public.seo_locations(slug) ON DELETE CASCADE | Unreferenced in static queries |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `latitude` | `NUMERIC` | NOT NULL | Unreferenced in static queries |
| `longitude` | `NUMERIC` | NOT NULL | Unreferenced in static queries |
| `name` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `slug` | `TEXT` | PRIMARY KEY | Unreferenced in static queries |

**Foreign Keys:**

- `city_slug` &rarr; `public.seo_locations(slug)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow public read access to seo_landmarks` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `seo_locations`
**Defined in:** `supabase/seo_schema.sql`

**Code References:**
- **Reads (1):** `src/lib/seo-fetchers.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `intro_text` | `TEXT` | - | Used |
| `latitude` | `NUMERIC` | - | Unreferenced in static queries |
| `longitude` | `NUMERIC` | - | Unreferenced in static queries |
| `name` | `TEXT` | NOT NULL | Used |
| `popular_tags` | `TEXT[]` | - | Unreferenced in static queries |
| `slug` | `TEXT` | PRIMARY KEY | Used |
| `state` | `TEXT` | NOT NULL | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow public read access to seo_locations` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `seo_property_types`
**Defined in:** `supabase/seo_schema.sql`

**Code References:**
- **Reads (1):** `src/lib/seo-fetchers.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `description` | `TEXT` | - | Unreferenced in static queries |
| `name_plural` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `name_singular` | `TEXT` | NOT NULL | Unreferenced in static queries |
| `slug` | `TEXT` | PRIMARY KEY | Used |

**Foreign Keys:**

- None

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow public read access to seo_property_types` | `SELECT` | `PUBLIC` | `true` | `-` |

---

### `subscription_reminder_logs`
**Defined in:** `supabase/push_and_subscription_reminders.sql`

**Code References:**
- **Reads (1):** `src/utils/subscription-reminders.ts`
- **Writes (1):** `src/utils/subscription-reminders.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `channel` | `TEXT` | DEFAULT 'push' | Used |
| `details` | `JSONB` | DEFAULT '{}'::jsonb | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `reminder_type` | `TEXT` | NOT NULL | Used |
| `sent_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `status` | `TEXT` | DEFAULT 'sent' | Unreferenced in static queries |
| `subscription_id` | `UUID` | REFERENCES public.owner_subscriptions(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `subscription_id` &rarr; `public.owner_subscriptions(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Admins manage reminder logs` | `ALL` | `authenticated` | `auth.jwt() ->> 'email' = 'superadmin@fixstay.com'` | `-` |
| `Owners view their own reminder logs` | `SELECT` | `authenticated` | `owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())` | `-` |

---

### `support_messages`
**Defined in:** `supabase/migrations/20260701000000_add_owner_support_messages.sql`

**Code References:**
- **Reads (1):** `src/app/dashboard/messages/support-actions.ts`
- **Writes (1):** `src/app/dashboard/messages/support-actions.ts`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `attachment_url` | `TEXT` | - | Used |
| `content` | `TEXT` | NOT NULL | Used |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `is_read` | `BOOLEAN` | NOT NULL DEFAULT false | Used |
| `owner_id` | `UUID` | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE | Used |
| `sender_type` | `TEXT` | NOT NULL CHECK (sender_type IN ('admin', 'owner')) | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Admins can view all support messages` | `SELECT` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id ...` | `-` |
| `Admins can insert support messages` | `INSERT` | `PUBLIC` | `-` | `EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id ...` |
| `Admins can update support messages` | `UPDATE` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id ...` | `-` |
| `Owners can view their own support messages` | `SELECT` | `PUBLIC` | `auth.uid() = owner_id` | `-` |
| `Owners can insert their own support messages` | `INSERT` | `PUBLIC` | `-` | `auth.uid() = owner_id
        AND sender_type = 'owner'` |
| `Owners can update their own support messages` | `UPDATE` | `PUBLIC` | `auth.uid() = owner_id` | `-` |

---

### `user_push_tokens`
**Defined in:** `supabase/push_and_subscription_reminders.sql`

**Code References:**
- **Reads (1):** `src/utils/fcm.ts`
- **Writes (1):** `src/app/api/notifications/register-token/route.ts`
- **Deletes (2):** `src/utils/fcm.ts`, `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `device_info` | `JSONB` | DEFAULT '{}'::jsonb | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Unreferenced in static queries |
| `last_seen_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `platform` | `TEXT` | NOT NULL DEFAULT 'android' | Unreferenced in static queries |
| `token` | `TEXT` | NOT NULL UNIQUE | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `user_id` &rarr; `public.auth(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Users can insert their own push tokens` | `INSERT` | `authenticated` | `-` | `auth.uid() = user_id` |
| `Users can update their own push tokens` | `UPDATE` | `authenticated` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `Users can view their own push tokens` | `SELECT` | `authenticated` | `auth.uid() = user_id` | `-` |

---

### `wallet_transactions`
**Defined in:** `supabase/migrations/proposed_database_performance_indexes.sql, supabase/fix_influencer_dashboard.sql, supabase/wallet_migrations.sql`

**Code References:**
- **Reads (5):** `src/app/actions/wallet.ts`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/agent/page.tsx`, `src/app/dashboard/owner/actions.ts`, `src/app/dashboard/owner/profile/page.tsx`
- **Writes (2):** `src/app/dashboard/admin/actions.ts`, `src/app/guest/property/[id]/actions.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `amount` | `NUMERIC` | NOT NULL | Used |
| `booking_id` | `UUID` | REFERENCES public.bookings(id) ON DELETE SET NULL | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Used |
| `description` | `TEXT` | - | Used |
| `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | Used |
| `transaction_type` | `TEXT` | NOT NULL DEFAULT 'earning' | Used |
| `user_id` | `UUID` | REFERENCES auth.users(id) ON DELETE CASCADE | Used |

**Foreign Keys:**

- `user_id` &rarr; `public.auth(id)`
- `booking_id` &rarr; `public.bookings(id)`
- `user_id` &rarr; `public.auth(id)`
- `booking_id` &rarr; `public.bookings(id)`
- `user_id` &rarr; `public.auth(id)`
- `booking_id` &rarr; `public.bookings(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Users can view their own wallet transactions` | `SELECT` | `PUBLIC` | `user_id = (SELECT auth.uid())` | `-` |
| `Admins can view all wallet transactions` | `SELECT` | `PUBLIC` | `EXISTS (
            SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() A...` | `-` |

---

### `whatsapp_accounts`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql, supabase/whatsapp_campaigns.sql`

**Code References:**
- **Reads (5):** `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/whatsapp/auth/embedded/route.ts`, `src/app/api/whatsapp/templates/sync/route.ts`, `src/app/dashboard/owner/MarketingSection.tsx`, `src/lib/whatsapp.ts`
- **Writes (2):** `src/app/api/whatsapp/auth/embedded/route.ts`, `src/app/dashboard/admin/whatsapp/page.tsx`
- **Deletes (1):** `src/utils/supabase/admin.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `access_token` | `TEXT` | - | Used |
| `business_name` | `TEXT` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `phone_number_id` | `TEXT` | - | Used |
| `status` | `TEXT` | DEFAULT 'pending' | Used |
| `verified` | `BOOLEAN` | DEFAULT FALSE | Unreferenced in static queries |
| `waba_id` | `TEXT` | - | Used |
| `whatsapp_phone_number` | `TEXT` | - | Used |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`
- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow ALL on whatsapp_accounts` | `ALL` | `authenticated` | `true` | `-` |

---

### `whatsapp_templates`
**Defined in:** `supabase/migrations/20260610000000_whatsapp_crm.sql, supabase/whatsapp_campaigns.sql`

**Code References:**
- **Reads (3):** `src/app/api/campaigns/queue/route.ts`, `src/app/api/whatsapp/templates/sync/route.ts`, `src/app/dashboard/owner/campaigns/create/page.tsx`
- **Writes (1):** `src/app/api/whatsapp/templates/sync/route.ts`

**Columns:**

| Column | Type | Constraints / Details | Code Usage |
| :--- | :--- | :--- | :--- |
| `body_text` | `TEXT` | NOT NULL | Used |
| `category` | `TEXT` | - | Used |
| `components` | `JSONB` | - | Used |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Unreferenced in static queries |
| `id` | `UUID` | PRIMARY KEY DEFAULT uuid_generate_v4() | Used |
| `language_code` | `TEXT` | DEFAULT 'en' | Used |
| `owner_id` | `UUID` | REFERENCES public.owners(id) ON DELETE CASCADE | Used |
| `status` | `TEXT` | DEFAULT 'APPROVED' | Used |
| `template_name` | `TEXT` | NOT NULL | Used |
| `variable_count` | `INTEGER` | DEFAULT 0 | Unreferenced in static queries |

**Foreign Keys:**

- `owner_id` &rarr; `public.owners(id)`

**Row Level Security (RLS) Policies:**

| Policy Name | Command | Target Role | Using Expression | Check Expression |
| :--- | :--- | :--- | :--- | :--- |
| `Allow ALL on whatsapp_templates` | `ALL` | `authenticated` | `true` | `-` |

---

## Postgres Views

### `feature_usage_metrics` (VIEW)
**Defined in:** `supabase/feature_usage_metrics.sql`
**Code References:** *None*
```sql
SELECT 
  (SELECT count(DISTINCT owner_id) FROM leads) AS owners_using_lead_form,
  (SELECT count(DISTINCT owner_id) FROM guest_checkins) AS owners_using_guest_form
```

### `owner_checkin_usage` (VIEW)
**Defined in:** `supabase/detailed_feature_usage.sql`
**Code References:** `src/app/dashboard/admin/page.tsx`
```sql
SELECT 
  owners.id as owner_id,
  owners.name as owner_name,
  owners.email as owner_email,
  COALESCE(count(guest_checkins.id), 0) as total_checkins,
  max(guest_checkins.created_at) as last_activit
```

### `owner_lead_usage` (VIEW)
**Defined in:** `supabase/detailed_feature_usage.sql`
**Code References:** `src/app/dashboard/admin/page.tsx`
```sql
SELECT 
  owners.id as owner_id,
  owners.name as owner_name,
  owners.email as owner_email,
  COALESCE(count(leads.id), 0) as total_leads,
  max(leads.created_at) as last_activity
FROM owners
LEFT JO
```
