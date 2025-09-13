# Alumni Connect — Database Schema & Migrations (Step 2)

**Owner:** Jose Tavarez  
**Author:** Product/Tech  
**Version:** v1.0  
**Goal:** Extend the current Supabase/Postgres schema to support yearbook OCR/face tags/claims, Groups & Clubs, Events, Business Listings, Jobs, Mentorship, and Safety queues — all aligned with the IA (Step 1).

---

## Existing Core (from current project)【87†PROJECT_OVERVIEW.md†L300-L310】
- **profiles**: User profiles with basic info
- **user_education**: Education history linking users to schools
- **yearbooks**: Yearbook files with metadata and school associations
- **schools**: School directory
- **messages**: Private messaging
- **connections**: Alumni network connections

---

## New & Extended Tables

### 1. Yearbook Enhancements
**yearbooks** (extend)
- id (uuid, pk)
- school_id (fk → schools)
- year (int)
- uploaded_by (fk → profiles)
- file_url (text)
- status (enum: processing, ready, flagged)
- created_at

**yearbook_pages** (new)
- id (uuid, pk)
- yearbook_id (fk)
- page_number (int)
- image_url (text)
- ocr_text (tsvector for search)
- processed_at

**yearbook_faces** (new)
- id (uuid, pk)
- page_id (fk)
- bbox (jsonb: x,y,w,h)
- detected_name (text, nullable)
- claimed_by (fk → profiles, nullable)
- verified (boolean)

**yearbook_claims** (new)
- id (uuid, pk)
- face_id (fk → yearbook_faces)
- user_id (fk → profiles)
- status (enum: pending, approved, rejected)
- created_at

**yearbook_flags** (new)
- id (uuid, pk)
- yearbook_id or page_id
- reason (enum: nudity, violence, copyright)
- flagged_by (fk → profiles)
- reviewed (boolean)

---

### 2. Groups & Clubs
**groups**
- id (uuid, pk)
- type (enum: class, club, custom)
- school_id (fk)
- name (text)
- description (text)
- created_by (fk → profiles)
- privacy (enum: public, private)
- created_at

**group_members**
- id (uuid, pk)
- group_id (fk)
- user_id (fk)
- role (enum: member, admin, moderator)
- joined_at

---

### 3. Events
**events**
- id (uuid, pk)
- host_type (enum: school, group, user)
- host_id (uuid)
- title (text)
- description (text)
- start_time, end_time
- location (text / jsonb for virtual link)
- ticketing (jsonb: price, capacity)
- privacy (enum: public, private, invite-only)
- created_by (fk → profiles)

**event_attendees**
- id (uuid, pk)
- event_id (fk)
- user_id (fk)
- status (enum: interested, going, declined)
- ticket_id (fk → payments if Stripe integrated)

---

### 4. Businesses
**businesses**
- id (uuid, pk)
- owner_id (fk → profiles)
- name (text)
- category (enum or text)
- location (text/jsonb)
- website (text)
- alumni_perk (text)
- is_verified (boolean)
- created_at

**business_listings** (for boosted/premium)
- id (uuid, pk)
- business_id (fk)
- type (enum: free, premium, boosted)
- start_date, end_date

---

### 5. Jobs & Mentorship
**jobs**
- id (uuid, pk)
- posted_by (fk → profiles)
- title (text)
- company (text)
- location (text)
- description (text)
- apply_url (text)
- created_at

**mentorship_profiles**
- id (uuid, pk)
- user_id (fk → profiles)
- role (enum: mentor, mentee)
- topics (text[])
- availability (jsonb)
- created_at

---

### 6. Safety & Moderation
**reports**
- id (uuid, pk)
- reported_type (enum: post, user, message, yearbook, event)
- reported_id (uuid)
- reason (enum: impersonation, inappropriate, spam, copyright, other)
- reporter_id (fk → profiles)
- created_at
- status (enum: open, reviewing, resolved)

**moderation_queue**
- id (uuid, pk)
- item_type (enum: yearbook, post, event, business)
- item_id (uuid)
- status (enum: pending, approved, rejected)
- moderator_id (fk → profiles, nullable)
- reviewed_at

---

## Relationships
- **profiles ↔ user_education ↔ schools** (one-to-many)
- **yearbooks ↔ yearbook_pages ↔ yearbook_faces** (nested hierarchy)
- **yearbook_faces ↔ yearbook_claims ↔ profiles** (claim/verify)
- **groups ↔ group_members ↔ profiles**
- **events ↔ event_attendees ↔ profiles**
- **businesses ↔ business_listings**
- **jobs ↔ profiles (posted_by)**
- **mentorship_profiles ↔ profiles**
- **reports/moderation_queue** link to all entities

---

## RLS & Permissions (outline)
- **yearbooks/yearbook_pages**: insert by verified uploader; read public if alumni-only, otherwise restricted
- **yearbook_faces/claims**: only claimant can create; moderators approve
- **groups/events**: creators = admin; RLS checks group membership for private groups
- **businesses/jobs**: only owner/poster can edit
- **reports/moderation_queue**: moderators only

---

## Migration Plan (Supabase/Postgres)
1. Add **new tables** (`yearbook_pages`, `yearbook_faces`, `yearbook_claims`, `groups`, `events`, `businesses`, `jobs`, `mentorship_profiles`, `reports`, `moderation_queue`).
2. Extend existing tables (`yearbooks` add status; `profiles` add verification_level, privacy settings).
3. Create indexes: `GIN` on `yearbook_pages.ocr_text`, btree on foreign keys.
4. Add enums (`verification_status`, `claim_status`, `report_reason`, etc.).
5. Apply RLS policies per table (Supabase). Test with staging data.

---

**Next Step (Step 3):** Data flow diagrams — upload pipeline (OCR, face detect, safety scan), claim/verify flow, event creation → ticketing, report/moderation queue lifecycle.

