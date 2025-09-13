# Alumni Connect — Database Schema & Supabase Migrations (Step 2)

**Scope:** Yearbooks (OCR/Face/Claims), Safety/Moderation, Social (Posts/Comments/Reactions), Network (Connections/Groups), Events/Ticketing, Businesses, Jobs, Mentorship, Messaging, Notifications, Search.

**DB:** PostgreSQL (Supabase) with strict RLS. All tables use `uuid` PKs (`gen_random_uuid()`), `created_at`/`updated_at` timestamps, and soft-delete `deleted_at` where useful.

---

## Guiding Principles
1. **Privacy-first defaults** (details unlocked on mutual connection or same-class membership).
2. **Least-privilege RLS** with clear roles: `unverified`, `verified_alumni`, `school_admin`, `moderator`, `staff`.
3. **Write-ahead pipeline** for yearbook processing: originals → safety scan → OCR → faces → claims.
4. **Search-ready**: tsvector indexes across people, schools, posts, and yearbook names.
5. **Auditable**: all moderation and verification actions logged.

---

## High-Level Entities (ASCII)
```
School(⟂aliases) ─┬─ ClassYear ─┬─ Yearbook ─┬─ YearbookPage ─┬─ PageFace
                  │             │             └─ PageNameOCR ──┘
                  │             └─ Claim (face/name → user)
User(Profile) ── user_education ────────────────┘

User ─ Connections ─ Groups(Clubs/Classes) ─ GroupMembers ─ GroupPosts
User ─ Posts ─ Comments ─ Reactions

Events ─ EventTickets ─ Orders(Stripe)  
Businesses ─ BusinessClaims  
Jobs ─ JobApplications  
MentorshipProfiles ─ MentorshipMatches

Messaging: Conversations ─ ConversationMembers ─ Messages

Moderation: Reports ─ Actions ─ SafetyQueue(uploads) ─ SafetyEvents

Notifications (fan-out)  
Search indices (materialized views/tsvector columns)
```

---

## Enumerations
```sql
create type trust_level as enum ('unverified','verified_alumni','school_admin','moderator','staff');
create type visibility as enum ('public','alumni_only','school_only','connections_only','private');
create type media_scan_status as enum ('pending','clean','flagged','quarantined','error');
create type report_reason as enum ('impersonation','nudity','violence','harassment','copyright','spam','other');
create type event_role as enum ('host','cohost','organizer','moderator');
```

---

## Core: Schools & People
```sql
-- schools
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nces_id text, -- optional canonical id if available
  district text, city text, state text, country text,
  established_year int,
  website text,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.schools using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'')));

-- school aliases for merges/renames
create table if not exists public.school_aliases (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  alias text not null
);

-- cohort year within a school
create table if not exists public.class_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  year int not null,
  unique(school_id, year)
);

-- profiles (extend existing)
alter table public.profiles
  add column if not exists trust trust_level default 'unverified',
  add column if not exists is_private boolean default false,
  add column if not exists headline text,
  add column if not exists location text,
  add column if not exists industry text;

-- education history (existing v2 assumed)
create table if not exists public.user_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  class_year_id uuid references public.class_years(id) on delete set null,
  start_year int, end_year int, graduated boolean,
  clubs text[], teams text[],
  created_at timestamptz default now()
);
```

**RLS (examples)**
```sql
alter table public.schools enable row level security;
create policy schools_read on public.schools for select using (true);

alter table public.user_education enable row level security;
create policy edu_self_rw on public.user_education
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## Yearbooks & Processing Pipeline
```sql
-- yearbook file meta
create table if not exists public.yearbooks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_year_id uuid references public.class_years(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text,
  storage_path text not null, -- storage bucket key of original
  page_count int,
  status media_scan_status default 'pending',
  ocr_done boolean default false,
  face_done boolean default false,
  is_public boolean default false,
  visibility visibility default 'alumni_only',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- logical pages (post-processor writes one row per page)
create table if not exists public.yearbook_pages (
  id uuid primary key default gen_random_uuid(),
  yearbook_id uuid references public.yearbooks(id) on delete cascade,
  page_number int not null,
  tile_manifest text, -- JSON path to tiles/IIIF manifest
  image_path text, -- storage key of full-res image
  unique(yearbook_id, page_number)
);

-- OCR names/strings per page
create table if not exists public.page_names_ocr (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.yearbook_pages(id) on delete cascade,
  bbox int4range[], -- optional bounding boxes
  text text not null
);
create index on public.page_names_ocr using gin (to_tsvector('simple', text));

-- detected faces per page
create table if not exists public.page_faces (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.yearbook_pages(id) on delete cascade,
  bbox int4range not null,
  embedding vector(256), -- optional if using pgvector later
  claimed_by uuid references auth.users(id)
);

-- a claim ties a user to an OCR name and/or a face
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  page_face_id uuid references public.page_faces(id) on delete set null,
  page_name_id uuid references public.page_names_ocr(id) on delete set null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- safety queue for media scans
create table if not exists public.safety_queue (
  id uuid primary key default gen_random_uuid(),
  yearbook_id uuid references public.yearbooks(id) on delete cascade,
  status media_scan_status default 'pending',
  findings jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
```

**Storage Buckets**
- `yearbooks-originals` (PDFs/images; private)  
- `yearbooks-tiles` (IIIF/Deep Zoom tiles; public-read, watermarked)  
- `post-media` (images/video; public-read)  
- `avatars` (public-read)  

**Processing Flow (signals via DB events / Supabase Functions)**
1. Insert into `yearbooks` → trigger inserts `safety_queue` (`pending`).
2. External worker scans → updates `safety_queue.status` to `clean|flagged|quarantined` and `yearbooks.status`.
3. If `clean` → worker generates pages & tiles → inserts `yearbook_pages` and writes `image_path/tile_manifest`.
4. OCR → `page_names_ocr` rows; Face detect → `page_faces` rows.
5. Claim flow → writes `claims` with RLS-guarded approval path for moderators/school_admins.

**RLS (read examples)**
```sql
alter table public.yearbooks enable row level security;
create policy yearbooks_read on public.yearbooks for select using (
  visibility in ('public') OR
  (visibility in ('alumni_only','school_only') AND exists (
    select 1 from public.user_education ue
    where ue.user_id = auth.uid() and ue.school_id = yearbooks.school_id
  ))
);
create policy yearbooks_insert on public.yearbooks for insert with check (auth.uid() = uploaded_by);
```

---

## Social: Posts, Comments, Reactions
```sql
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id), -- optional scope
  group_id uuid references public.groups(id), -- optional
  visibility visibility default 'alumni_only',
  text text,
  media jsonb, -- array of storage keys/metadata
  metrics jsonb default '{}'::jsonb, -- like_count, comment_count, share_count
  created_at timestamptz default now()
);
create index on public.posts using gin (to_tsvector('simple', coalesce(text,'')));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

create table if not exists public.reactions (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  emoji text default 'like',
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
```

**RLS**
```sql
alter table public.posts enable row level security;
create policy posts_read on public.posts for select using (
  visibility='public' OR author_id = auth.uid() OR (
    visibility in ('alumni_only','school_only','connections_only') AND (
      exists (select 1 from public.connections c where
        (c.user_id = author_id and c.connection_id = auth.uid() and c.status='accepted') or
        (c.user_id = auth.uid() and c.connection_id = author_id and c.status='accepted')
      )
      OR exists (select 1 from public.user_education ue where ue.user_id = auth.uid() and ue.school_id = public.posts.school_id)
    )
  )
);
create policy posts_crud_self on public.posts for all using (author_id = auth.uid()) with check (author_id = auth.uid());
```

---

## Network: Connections, Groups/Clubs
```sql
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  connection_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('pending','accepted','rejected','blocked')) default 'pending',
  created_at timestamptz default now(),
  unique(user_id, connection_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id), -- null for global
  name text not null,
  kind text check (kind in ('class','club','team','custom')) default 'custom',
  visibility visibility default 'alumni_only',
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
```

---

## Events & Ticketing
```sql
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_type text check (host_type in ('school','group','user')) not null,
  host_id uuid not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  is_virtual boolean default false,
  visibility visibility default 'alumni_only',
  ticketing_enabled boolean default false,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  price_cents int default 0,
  currency text default 'USD',
  quantity int,
  sales_start timestamptz, sales_end timestamptz
);

create table if not exists public.event_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  purchaser_id uuid references auth.users(id) on delete set null,
  ticket_id uuid references public.event_tickets(id) on delete set null,
  qty int default 1,
  stripe_payment_intent text,
  status text check (status in ('created','paid','refunded','canceled')) default 'created',
  created_at timestamptz default now()
);
```

---

## Businesses, Jobs, Mentorship
```sql
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text, website text, location text,
  perk text, -- alumni benefit
  is_premium boolean default false,
  verified boolean default false
);
create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('pending','approved','rejected')) default 'pending'
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid references auth.users(id) on delete set null,
  title text not null, company text, location text, remote boolean,
  description text, apply_url text, visibility visibility default 'public'
);
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  note text, status text default 'applied'
);

create table if not exists public.mentorship_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('mentor','mentee','both')) default 'both',
  topics text[], availability jsonb
);
create table if not exists public.mentorship_matches (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references auth.users(id) on delete cascade,
  mentee_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('suggested','accepted','ended')) default 'suggested'
);
```

---

## Messaging
```sql
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  is_group boolean default false,
  title text
);
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  text text, media jsonb,
  created_at timestamptz default now()
);
```

**RLS basics**
```sql
alter table public.conversation_members enable row level security;
create policy conv_member_self on public.conversation_members for select using (auth.uid() = user_id);

alter table public.messages enable row level security;
create policy messages_visibility on public.messages for select using (
  exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()
  )
);
```

---

## Moderation & Safety
```sql
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_table text not null, -- e.g. 'posts','profiles','yearbook_pages'
  target_id uuid not null,
  reason report_reason not null,
  details text,
  created_at timestamptz default now(),
  status text check (status in ('open','reviewing','closed')) default 'open'
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.moderation_reports(id) on delete cascade,
  moderator_id uuid references auth.users(id),
  action text, -- e.g., 'remove_post','warn_user','ban_user'
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  entity text, entity_id uuid,
  outcome text, payload jsonb,
  created_at timestamptz default now()
);
```

---

## Notifications (Fan-out on write)
```sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text, -- 'connection_request','comment','claim_approved', etc.
  payload jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index on public.notifications (user_id, is_read);
```

---

## Search & Indexing
- Add `tsvector` columns with triggers for: `schools`, `profiles`, `posts`, `page_names_ocr`.
- Future: pgvector for face embeddings (`page_faces.embedding`) for visual search.

Example trigger:
```sql
alter table public.posts add column if not exists search tsvector;
create index posts_search_idx on public.posts using gin (search);
create or replace function public.posts_tsvector() returns trigger as $$
begin
  new.search := to_tsvector('simple', coalesce(new.text,''));
  return new;
end;$$ language plpgsql;
create trigger tsv_posts before insert or update on public.posts
for each row execute function public.posts_tsvector();
```

---

## Stripe-ready (Events first)
- Store only non-PII Stripe IDs in `event_orders.stripe_payment_intent`.
- Webhook handler updates `status` to `paid|refunded|canceled`.

---

## RLS Checklist (to implement next)
- [ ] `profiles` read/write self; public minimal fields
- [ ] `yearbooks/pages/ocr/faces` read based on visibility and school membership; write by processors/moderators
- [ ] `claims` insert by claimant, approve by `moderator|school_admin`
- [ ] `posts/comments/reactions` per visibility + connections
- [ ] `groups/group_members` read by members, class/club auto-joins
- [ ] `events/orders/tickets` per visibility; host & buyer rights
- [ ] `businesses/jobs/mentorship` public read, owner/members write
- [ ] `messages` visible to conversation members only
- [ ] `moderation_*` visible to moderators/staff only

---

## Migration Order (safe to run sequentially)
1. Enums → core tables (`schools`, `class_years`, `profiles` extensions, `user_education`).
2. Yearbooks pipeline tables (`yearbooks`, `yearbook_pages`, `page_names_ocr`, `page_faces`, `claims`, `safety_queue`).
3. Social graph (`connections`, `groups`, `group_members`, `posts`, `comments`, `reactions`).
4. Events & ticketing (`events`, `event_tickets`, `event_orders`).
5. Businesses, jobs, mentorship.
6. Messaging (`conversations`, `conversation_members`, `messages`).
7. Moderation & safety events, notifications.
8. Indexes + search triggers.
9. Enable RLS and add policies per table.

---

## Minimal Seed & Fixtures (optional for dev)
- 10 schools across FL with `class_years` 1980–2025.
- 2 sample yearbooks with 20 pages each.
- 20 users with education links; 5 verified.
- 10 posts, 20 comments, 30 reactions.
- 2 events (school + group), 3 tickets, 5 orders (fake).

---

## Next Step (Step 3)
**Pipelines & Services:**
- Yearbook ingestion workers (OCR/face/tiling), storage policies, watermarking strategy, and the claim verification workflow (UI + moderator tooling).
- Real-time channels (messages, notifications), feed heuristics (Network vs For You), and abuse-prevention (rate limits & link scanning).
- API surface (Supabase RPCs) and component contracts for the frontend.

