# Alumni Connect — Navigation & Information Architecture (Step 1)

**Owner:** Jose Tavarez  
**Author:** Product/UX  
**Version:** v1.0 (Initial overhaul)  
**Goal:** Define a crisp, scalable navigation and IA that makes Alumni Connect feel like a real social platform, prioritizing (1) yearbook-first identity, (2) effortless reconnection, (3) safe growth loops, and (4) monetizable surfaces without ads at launch.

---

## Product Principles
1. **Yearbook-first graph**: The yearbook is the unique identity anchor. Claiming your portrait and class is the core loop.
2. **Privacy-by-default**: Profile details unlock when both sides connect; public basics are name, school, grad year.
3. **Two feeds**: *Network* (people you know) and *For You* (what’s going viral across schools), swipe-friendly on mobile.
4. **School & Class hubs**: Official school spaces + class/club groups are first-class citizens.
5. **Safety**: All uploads auto-scanned (nudity/violence). Clear report/block flows. Tiered trust levels.
6. **Monetization later, not louder**: Core is free; paid surfaces feel like power tools (events, groups, business listings, mentorship, jobs).

---

## Primary Navigation

### Mobile (bottom tab bar)
1. **Home** (dual feed): Network / For You tabs
2. **Yearbooks**: Explore, My Yearbooks, Upload, Claim
3. **Network**: People, Schools, Classes/Clubs, Groups (discovery)
4. **Messages**: 1:1 and Group DMs
5. **Profile**: Me (privacy, verification, settings)

**Global actions**: sticky **Search** (top), floating **Create (+)** for Post / Event / Group / Listing / Job.

### Desktop (persistent left sidebar + top bar)
- **Home**, **Yearbooks**, **Network**, **Messages**, **Events**, **Businesses**, **Jobs**, **Mentorship**, **Notifications**, **Profile**.
- **Search** in top bar; right rail for *Who to reconnect*, *Upcoming events*, *Suggested groups*.

---

## Site Map & IA (high-level)

- **Home**
  - Tabs: **Network** | **For You**
  - Composer: text, photo, link, yearbook page snippet, event, job, business
  - Modules: Who to reconnect, Trending schools, Upcoming reunions, New business listings

- **Yearbooks**
  - **Explore** (browse by School → Year; filters: state, district, era, media type)
  - **My Yearbooks** (books you uploaded/claimed)
  - **Upload** (file picker, TOS, safety scan status)
  - **Claim** (name & face suggestions from OCR/vision)
  - **Reader** (tiling zoom, OCR search-in-book, page notes, face tags)

- **Network**
  - **People** (classmates, same era, mutuals)
  - **Schools** (directory, follow school)
  - **Classes & Clubs** (auto class hubs, user-created clubs)
  - **Groups** (custom groups, premium options)

- **Messages**
  - 1:1 and group threads, attachments, read receipts, typing

- **Events**
  - Discover (school verified vs alumni groups), calendar view
  - Create Event (official school or group), ticketing (Stripe), roles & permissions

- **Businesses**
  - Directory (alumni-owned), perks, verify + claim business, premium listing/boost

- **Jobs & Mentorship**
  - Job board (postings by alumni/recruiters), save & refer
  - Mentorship opt-in, matching by industry/grad year/location

- **Notifications**
  - Activity (connections, comments), System (verification, safety), Digests

- **Profile** (Me / Others)
  - Header (name, school(s), grad year(s), verification badge)
  - Tabs: About | Education | Activity | Photos | Yearbook Tags | Connections
  - Privacy toggles per section; connection request CTA

- **Settings & Verification Center**
  - Account, Security (2FA), Privacy, Notifications, Data export/delete, Verification steps

---

## Page Blueprints (key screens)

### Home (Feed)
- **Top**: Search, Composer (What’s new?), Feed tabs (Network | For You)
- **Cards**: Post types (text/photo/link/yearbook snippet/event/job/business)
- **Actions**: Like, Comment, Share, Save, Report
- **Empty state**: “Claim your yearbook photo to start finding classmates” CTA

### Yearbooks → Upload
- Accept: **PDF, JPEG/JPG, PNG** (per file up to 500MB; multi-file allowed)  
- Flow: Select → Extract pages → **Safety scan (nudity/violence)** → OCR text → Face detect → Choose School+Year → Submit  
- Status: Background processing with progress + email notification when ready  
- Ownership: Uploader attribute; DMCA takedown link in footer of reader

### Yearbooks → Reader
- Tiled zoom viewer (fast pan/zoom), page thumbnails left, toolbar (search-in-book, share snippet, report)
- Inline **face tags** and **name highlights** from OCR
- CTA: “Is this you? Claim this face/name” → verification

### Network → People
- Filters: School, Grad year range, Location, Industry, Shared clubs/teams
- Sort: Mutuals, Recently joined, Same class → one-tap connect

### Events
- Create: Title, Date/Time, Location/Virtual, Host (School/Group), Tickets (free/paid), Capacity, Privacy  
- Roles: Host, Co-host, Organizer, Moderator
- Surfaces: Event page (updates, attendees, chat), ICS export

### Businesses
- Create Listing: Name, Category, Location, Website, Perk for alumni, Proof of ownership  
- Premium options: Boosted placement, badge

### Jobs & Mentorship
- Job post: Title, Company, Location/Remote, Description, Apply link  
- Mentorship: Mentor/mentee opt-in, topics, availability

---

## Roles & Permissions
- **Unverified User**: Limited DMs, low reach in For You, can browse previews
- **Verified Alumni**: Full DM, claim yearbook, create groups/events
- **School Admin (verified)**: Official school page, verified events, moderation tools
- **Moderator**: Handles reports, content review queue

---

## Safety & Moderation Surfaces
- Upload-time scanning (nudity/violence); quarantine if flagged
- Report menu on all cards; categories (Impersonation, Inappropriate, Copyright, Spam)
- Block/mute; rate limits; link scanning; IP throttling
- Takedown workflow (DMCA); appeal process

---

## Growth Hooks & Onboarding
1. **Claim your photo** wizard (from Reader, Profile, and Home empty states)
2. Invite classmates: QR/share links pre-filled with school & year
3. Weekly email digest: “5 from Class of 2012 joined; your photo got 3 tags”
4. Referral unlocks (non-intrusive): Badge or early access to features

---

## Navigation Copy & Labels (finalize later, examples)
- Home, Yearbooks, Network, Messages, Profile, Events, Businesses, Jobs, Mentorship, Notifications, Settings

---

## URL Routing (examples)
- `/` → Home (Network/ForYou stateful tab)
- `/yearbooks` | `/yearbooks/upload` | `/yearbooks/:schoolSlug/:year`
- `/schools` | `/schools/:schoolSlug` | `/schools/:schoolSlug/classes/:year`
- `/people` (network discovery)
- `/messages/:threadId`
- `/events` | `/events/create` | `/events/:eventId`
- `/businesses` | `/businesses/:listingId`
- `/jobs` | `/jobs/:jobId`
- `/mentorship`
- `/u/:username`
- `/settings` | `/verify`

---

## Metrics Exposed in UI
- Home: New classmates verified this week; events near you; trending groups
- Yearbooks: # books uploaded, # pages processed, # claims, processing queue
- Network: Connection requests, mutuals, alumni near you
- Profile: Views, connection accepts, yearbook tags

---

## Accessibility & Internationalization
- WCAG AA targets; min 44px touch targets; keyboard nav; high-contrast theme
- i18n-ready copy; RTL support; locale-aware names & dates

---

## Performance & Budgets
- LCP < 2.5s, TTI < 3s mobile; feed card < 80KB incl. media preview
- Reader uses tiled images + lazy OCR highlights; cache at edge (CDN)

---

## Tracking Plan (event names)
- `auth_signup`, `education_added`, `yearbook_uploaded`, `scan_flagged`, `ocr_done`, `face_detected`, `claim_started`, `claim_verified`, `connection_sent`, `connection_accepted`, `post_published`, `event_created`, `ticket_purchased`, `listing_created`, `job_posted`, `mentorship_optin`

---

## Out-of-Scope (Phase 1 cut list)
- Native mobile apps (keep as PWA), advanced recommendation ML (bootstrap heuristics first), recruiter payments (collect interest, launch later)

---

**Next Step (Step 2):** Database schema & migrations for Yearbooks (OCR/face tags), Claims, Groups/Clubs, Events, Business Listings, Jobs, Mentorship, Safety queues.

