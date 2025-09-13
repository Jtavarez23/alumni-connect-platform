# Alumni Connect — Execution Plan & Sprint Backlog (Step 5)

**Owner:** Jose Tavarez  
**Author:** Product/Engineering  
**Version:** v1.0  
**Goal:** Provide a prioritized, solo-founder-friendly execution plan with sprint backlog (P0/P1), low‑fi wireframes for key flows, and guidance for bootstrapped rollout.

---

## 1. Prioritization Framework
- **P0 (Launch-Critical):** Core yearbook ingestion & reader, claims, feeds, messaging, profiles, basic moderation.
- **P1 (Growth/Early Monetization):** Events + ticketing, businesses, jobs, mentorship.
- **P2 (Scale/Maturity):** Mobile apps, advanced search, face embeddings, alumni perks, premium monetization.

---

## 2. Sprint Backlog (6 Sprints @ 2 weeks each)

### Sprint 1 (P0)
- [ ] Set up Supabase schema & RLS (Step 2).  
- [ ] Storage buckets (`originals`, `tiles`, `previews`, `post-media`, `avatars`).  
- [ ] `YearbookUploadWizard` (file select, school/year assign, Supabase upload).  
- [ ] Trigger → `safety_queue` + stub worker (mock safe scan).  
- [ ] Profile page skeletons.  
- Deliverable: upload → see in DB → processing status visible.

### Sprint 2 (P0)
- [ ] Implement OCR + tiling workers (Step 3).  
- [ ] `YearbookReader` with Deep Zoom viewer + OCR overlay.  
- [ ] Claim flow (create claim, moderator approve stub).  
- [ ] Basic feed (network only) + `PostComposer` + `PostCard`.  
- Deliverable: browse yearbook → claim → see posts feed.

### Sprint 3 (P0)
- [ ] Messaging: conversations + realtime subscriptions.  
- [ ] Notifications bell + realtime updates.  
- [ ] Report button + `moderation_reports` inbox (read-only).  
- [ ] Weekly digest cron stub.  
- Deliverable: alumni can message each other + see notifications.

### Sprint 4 (P1)
- [ ] Events system: create, list, detail.  
- [ ] Ticket tiers + Stripe checkout handoff.  
- [ ] Event page with attendees tab.  
- Deliverable: reunion event creation & RSVPs.

### Sprint 5 (P1)
- [ ] Business directory + claim listing.  
- [ ] Job board + job posting.  
- [ ] Mentorship profile opt-in + match suggestions.  
- Deliverable: alumni can share businesses, jobs, mentorship interest.

### Sprint 6 (P2) - COMPLETED ✅
- [x] Mobile app development (React Native + Expo)  
- [x] Push notification integration with Expo  
- [x] Yearbook reader with touch gestures (pinch, pan, double-tap)  
- [x] Comprehensive testing suite (Jest + Detox)  
- [x] TypeScript compilation and linting cleanup  
- Deliverable: Production-ready mobile app with push notifications

---

## 3. Folder Structure (Frontend)
```
src/
├── components/
│   ├── yearbooks/
│   ├── feeds/
│   ├── events/
│   ├── businesses/
│   ├── jobs/
│   ├── mentorship/
│   ├── messaging/
│   ├── notifications/
│   └── moderation/
├── pages/
│   ├── yearbooks/
│   ├── events/
│   ├── network/
│   ├── messages/
│   └── profile/
├── hooks/
│   ├── useYearbook.ts
│   ├── useFeed.ts
│   ├── useMessages.ts
│   └── useNotifications.ts
├── lib/
│   ├── supabase.ts
│   ├── sentry.ts
│   └── analytics.ts
└── types/
```

---

## 4. Low-Fi Wireframes (ASCII)

### Yearbook Upload
```
[ Upload Yearbook ]
-------------------
[ Choose File ]  [ School Select ] [ Year Select ]
[ Progress Bar: |||||| 50% ]
(Status: Processing OCR...)
```

### Yearbook Reader + Claim
```
[ Yearbook: Miami High 2005 ]
-----------------------------
[ Page Viewer: tiled image ]
[ OCR text overlay ] [ Face boxes ]
(Is this you? [Claim])
```

### Feed
```
[ Network | For You ]
---------------------
[ PostCard: Jose T. ] "Just claimed my yearbook photo!"
[ Like ][ Comment ][ Share ]
```

### Events Create
```
[ Create Reunion Event ]
------------------------
Title: [___________]
Date: [_____] Time: [____]
Location: [________]
[ Add Ticket Tier ]
[ Publish ]
```

### People Discover
```
[ Find Classmates ]
-------------------
Filter: [School] [Year Range] [Location]
[ UserCard: Anna P. (2009) ] [Connect]
```

---

## 5. Metrics for Launch
- Yearbooks uploaded (P0).  
- Claims approved (P0).  
- Connections made (P0).  
- Messages sent (P0).  
- Events created (P1).  
- Businesses listed (P1).  

---

## 6. Solo-Founder Efficiency
- **CI/CD:** GitHub Actions → Vercel deploys.  
- **Monitoring:** Sentry + GA4.  
- **Docs:** keep `README` updated with runbook.  
- **Community:** recruit moderators from early alumni groups.  
- **Costs:** stay on Supabase Pro + Vercel Hobby until scaling.

---

## 7. Next Step (Step 6)
**Design System & UI Kit:** Define shadcn/ui component variants, Tailwind tokens (colors, spacing), typography scale, and reusable card layouts. Provide Figma (or Storybook) library to unify visual style across feeds, yearbooks, events, and business directories.

