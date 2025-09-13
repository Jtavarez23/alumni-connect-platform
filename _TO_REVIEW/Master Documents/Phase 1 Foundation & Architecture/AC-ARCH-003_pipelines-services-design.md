# Alumni Connect — Pipelines & Services (Step 3)

**Scope:** End-to-end flows and service design for (1) Yearbook ingestion (safety → OCR → faces → tiles → claims), (2) Moderation & safety, (3) Feeds & ranking, (4) Messaging & notifications (realtime), (5) Storage policies & watermarking, (6) RPCs/Edge Functions, (7) Schedulers/cron, (8) Observability & quotas.  
**Constraints:** Solo founder, low budget; Supabase-first; minimal external paid services.

---

## 1) Yearbook Ingestion Pipeline

### Buckets & Storage
- **yearbooks-originals** (private): raw uploads (PDF/JPG/PNG).  
- **yearbooks-tiles** (public): watermarked Deep Zoom/IIIF tiles.  
- **yearbooks-previews** (public): low-res preview images.  
- **avatars / post-media** (public).

**Storage Policies (high level)**
- Originals: `insert`: owner only; `select`: owner + moderators/school_admin; `delete`: owner until processed, then moderators only.  
- Tiles/Previews: public read; write via service role only.

### Processing Stages (state machine)
```
[pending] → [safety_scan] → [ocr] → [faces] → [tiling] → [ready]
                                 ↘ (flagged) → [quarantined]
```
- Orchestrate with a single **`yearbooks.status`** and a **`safety_queue`** row.  
- Each stage is **idempotent**; retries safe.

### Triggers & Workers (Supabase-first)
- **DB Trigger** (`after insert on yearbooks`): enqueue safety scan row in `safety_queue` and set `status = 'processing'`.
- **Edge Function** `worker-safety-scan` (Deno): polls `safety_queue where status='pending'` (or use `supabase.functions.schedule`).  
  - For each page image (or generated preview), run **NSFW/Nudity/Violence** classification. Budget options:
    - **Open-source**: NSFW.js / ONNX Runtime (CPU) → fast, lightweight; good first line.  
    - **Heavier**: OpenCV + simple heuristics for violence (weapons color/shape detection is noisy; focus on skin-tone proportions + entropy).  
    - **Fallback (paid)**: Rekognition/Sightengine per image only on suspicious previews.
  - Update `safety_queue.status`: `clean|flagged|quarantined`; mirror to `yearbooks.status`.

- **Edge Function** `worker-ocr`:
  - Convert PDFs → images (ImageMagick `pdftoppm` / `magick` in a containerized job) or for JPG/PNG use as-is.
  - **OCR**: Tesseract (languages: `eng` initially).  
  - Write per page record in `yearbook_pages` with `image_path`, and tokens into `page_names_ocr` (keep full text for search + optional name candidates).  
  - Name extraction heuristic: title-case token sequences; keep bounding boxes if `hOCR` enabled.

- **Edge Function** `worker-faces`:
  - Budget: start with **OpenCV Haar cascade** face detection.  
  - Persist `page_faces (bbox)`; leave `embedding` null initially.  
  - Future: add **pgvector** and lightweight embeddings (FaceNet/ArcFace) for selfie ↔ portrait similarity.

- **Edge Function** `worker-tiler`:
  - Generate **Deep Zoom** tiles (e.g., VIPS/`vips dzsave`) or IIIF manifest.  
  - Apply transparent **watermark overlay** or stamp in tile pipeline.  
  - Upload to `yearbooks-tiles` with predictable paths; save `tile_manifest` per page.

- **Completion**: set `yearbooks.status='ready'`, `ocr_done=true`, `face_done=true`.

### Claim Flow (UI + Backend)
1. User opens Reader; clicks **“Is this you?”** on face/name.
2. App creates `claims (status='pending', user_id, page_face_id|page_name_id)`.
3. **Auto-heuristics** to fast-track:
   - Same school+year in `user_education` AND
   - ≥2 confirmations from verified classmates **or** school_admin approve **or** matching alumni email domain.  
4. On approval: set `claims.status='approved'`, set `page_faces.claimed_by=user_id`, bump `profiles.trust='verified_alumni'`.
5. Notify claimant + classmates.

**Abuse & Privacy**
- Report button on claim (impersonation).  
- Opt-out (blur or untag on request) even if public yearbook.

---

## 2) Moderation & Safety

### Surfaces
- **Every card**: ••• → Report (Impersonation, Inappropriate, Copyright, Spam, Other).  
- **Upload Quarantine**: auto-hold when safety scan flagged; human review required.

### Queues & Roles
- `moderation_reports`, `moderation_actions` (Step 2).  
- Roles: `moderator`, `school_admin`.  
- Backoffice pages: **Reports Inbox**, **Yearbook Review**, **Claim Review**.

### Rate Limiting (Postgres-native)
- Table `throttle_events(user_id, kind, created_at)`; check count within window via function:
```sql
create or replace function can_post(u uuid, k text, max_count int, secs int)
returns boolean language sql as $$
  select count(*) < max_count from throttle_events
   where user_id=u and kind=k and created_at> now() - make_interval(secs=>secs);
$$;
```
- Gate writes (posts/messages/claims) via RPC that records an event on success.  
- IP-level throttling: store **hash(ip)** in `throttle_events` when available.

### Link Safety
- On post creation, async scan urls (HEAD + content-type).  
- Deny `data:` images; strip trackers; auto-nofollow.

---

## 3) Feeds & Ranking

### Feeds
- **Network**: posts from connections, same school/class, groups joined.  
- **For You**: trending across platform but de-duplicated by school affinity.

### Signals
- Recency (time decay), reactions, comments, reshares, author trust, same-school boost, same-year boost, group membership, text-contains school/class tags, safety score.

### Simple Scoring SQL (seed)
```sql
-- materialized view for trending (refresh every 5 min)
create materialized view if not exists mv_trending as
select p.id,
  (extract(epoch from now()-p.created_at)/3600.0) as hours,
  coalesce((p.metrics->>'like_count')::int,0) as likes,
  coalesce((p.metrics->>'comment_count')::int,0) as comments,
  coalesce((p.metrics->>'share_count')::int,0) as shares,
  -- Wilson-ish + time decay
  (likes*1 + comments*2 + shares*3) / pow(greatest(hours,1), 1.5) as score
from posts p
where p.visibility in ('public','alumni_only');
create index if not exists mv_trending_score_idx on mv_trending(score desc);
```

### Feed RPCs
- `rpc.get_network_feed(user_id uuid, cursor timestamptz)` → joins posts by connections + same school/class, ordered by score; keyset pagination.  
- `rpc.get_foryou_feed(user_id, cursor)` → joins `mv_trending` then applies affinity boosts (same school/year) and safety filtering.

---

## 4) Messaging & Notifications (Realtime)

### Messaging
- Use **Supabase Realtime** on `messages` and `conversation_members`.  
- Presence: track `last_seen_at` in `profiles`; ephemeral presence via client.

### Notifications
- Write to `notifications` on events: connection request/accept, comment/reply, claim approved, event updates, ticket purchased.  
- Client subscribes to `notifications` changes.  
- **Email digests** (weekly): `cron.digest-weekly` (Edge Function) builds per-user summaries.

---

## 5) Watermarking & Access Control

- **Tiles** watermarked with subtle diagonal text (school name + year + "Alumni Connect").  
- **Originals**: never publicly accessible; presigned URLs for moderators only.  
- **Zoom limits**: Max zoom for unverified viewers; full zoom for verified alumni of that school.  
- **Share Snippets**: sharing a page crops generates a preview stored in `yearbooks-previews` with automatic credit line.

---

## 6) RPCs / Edge Functions (Contract)

**Edge Functions (Deno)**
- `worker-safety-scan`: pulls pending, classifies, updates queue.
- `worker-ocr`: renders pages, OCR, stores text/bboxes.
- `worker-faces`: face detect, store boxes, (future) embeddings.
- `worker-tiler`: generate Deep Zoom tiles, watermark, publish.
- `cron-refresh-trending`: refresh materialized views.
- `cron-digest-weekly`: email digests via provider.
- `cron-cleanup`: purge expired previews, close stale claims.

**Postgres RPCs** (via `create function ... security definer`)
- `start_yearbook_processing(yearbook_id uuid)` → sanity checks + enqueue.  
- `submit_claim(page_face_id uuid, page_name_id uuid)` → inserts claim, enforces throttles.  
- `approve_claim(claim_id uuid)` / `reject_claim(claim_id uuid)` → moderator-only.  
- `create_event(...)` → validates roles (school admin/group admin).  
- `purchase_ticket(event_id uuid, ticket_id uuid, qty int)` → creates order shell; Stripe handled by Edge Function webhook.  
- `get_network_feed(...)`, `get_foryou_feed(...)` as above.

**Webhooks**
- `stripe/webhook` → mark `event_orders.status` transitions.  
- `mail/provider-webhook` (optional) → bounce handling.

---

## 7) Scheduling & Jobs

- **Supabase Cron** (or external cron if needed):
  - `cron-refresh-trending` every 5 minutes.  
  - `cron-digest-weekly` Wednesday 10:00 local.
  - `cron-cleanup` nightly: delete temp files, expire presigned URLs, archive resolved reports.
- **Back-pressure**: cap concurrent workers; use advisory locks to avoid double-processing same `yearbook_id`.

Example lock:
```sql
select pg_try_advisory_lock(hashtext('yb:'||yearbook_id::text));
```

---

## 8) Observability, Metrics, & Budgets

### Observability
- **Sentry**: capture exceptions in Edge Functions + frontend.  
- **Structured logs**: request_id, yearbook_id, stage, duration_ms.  
- **Audit logs**: all moderator actions → `moderation_actions`.

### Product Metrics (emit analytics events)
- `yearbook_uploaded`, `scan_flagged`, `ocr_done`, `faces_done`, `claim_started`, `claim_approved`, `connection_accepted`, `post_published`, `event_created`, `ticket_purchased`.

### Cost Controls
- Page cap per upload (e.g., 400 pages) and filesize cap (500MB).  
- Stage timeouts with retry backoff.  
- Free tier: limited tiles zoom for unverified users; verified alumni get HD.

---

## 9) Engineering Task Breakdown (tickets)

### A. Ingestion
- [ ] Storage buckets & policies (`originals`, `tiles`, `previews`).
- [ ] `yearbooks` trigger → enqueue `safety_queue`.
- [ ] Edge function: `worker-safety-scan` (NSFW.js baseline) + quarantine logic.
- [ ] Edge function: `worker-ocr` (ImageMagick + Tesseract, hOCR bboxes) + writes `yearbook_pages`, `page_names_ocr`.
- [ ] Edge function: `worker-faces` (OpenCV Haar) + writes `page_faces`.
- [ ] Edge function: `worker-tiler` (VIPS `dzsave`) + watermark + manifest.

### B. Claims & Verification
- [ ] Claim UI in Reader; create `claims` rows.
- [ ] Classmate confirmation UI; 2-approval rule; moderator override.
- [ ] RPCs: `submit_claim`, `approve_claim`, `reject_claim` (+ RLS).

### C. Feeds
- [ ] `mv_trending` + `cron-refresh-trending`.
- [ ] RPC: `get_network_feed`, `get_foryou_feed` with keyset pagination.
- [ ] Post metrics counters (triggers or app-side updates) with race-safe increments.

### D. Messaging & Notifications
- [ ] Realtime subscriptions; optimistic send with retry.  
- [ ] `notifications` writes on key events; client channel subscribe.  
- [ ] Weekly digest Edge Function + template.

### E. Moderation & Safety
- [ ] Report widget on all entities; write `moderation_reports`.
- [ ] Moderator Inbox pages; actions write `moderation_actions`.
- [ ] Rate limiting RPC guard + `throttle_events` table.

### F. Ops
- [ ] Sentry in Edge Functions; structured logs.  
- [ ] Backups & export/delete flows (user data).  
- [ ] Cron cleanup of previews and stale claims.

---

## 10) Risks & Mitigations
- **OCR accuracy** low on scans → allow manual page tagging + crowd corrections; highlight UI for corrections.  
- **Face detection** false positives → keep claim approvals human-in-the-loop; require classmate confirms.  
- **Moderation load** → throttle uploads; prioritize school-verified uploaders.  
- **Costs** → keep everything CPU/open-source initially; plug-in paid APIs selectively for accuracy when needed.

---

**Next Step (Step 4):** Frontend **component contracts & API spec** — detailed props for Upload/Reader/Claim widgets, Feeds, Events, Businesses, plus **RPC/Edge Function interfaces** and example TypeScript client hooks. 

