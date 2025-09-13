# Alumni Connect — Frontend Component Contracts & API Spec (Step 4)

**Owner:** Jose Tavarez  
**Author:** Product/Frontend  
**Version:** v1.0  
**Goal:** Define React component contracts, API/RPC signatures, hooks, and UI states for all core features so implementation can proceed without ambiguity. Aligns with Step 1 (IA), Step 2 (DB), and Step 3 (Pipelines).

---

## 0) Global Conventions
- **Stack:** React 18 + TypeScript, Vite, Tailwind + shadcn/ui, React Router, React Query.
- **State:** Server data via React Query; local UI via component state or Zustand (optional) for ephemeral UI flags.
- **Auth Guard:** `RequireAuth` gate around private routes.
- **Error Boundaries:** per route-level; retry button calls `queryClient.invalidateQueries`.
- **Loading UX:** skeletons for lists/cards; progress bars for uploads; optimistic UI for likes/comments.
- **Toasts & Modals:** shadcn/ui `Toast` + `Dialog` for claim flow, report, delete.
- **Media:** images use native lazy-loading; videos with poster frames; max width responsive.
- **Accessibility:** keyboard focus rings, ARIA labels, reduced motion support, 44px touch.

---

## 1) Shared Types (TS)
```ts
export type UUID = string;
export type Trust = 'unverified'|'verified_alumni'|'school_admin'|'moderator'|'staff';
export type Visibility = 'public'|'alumni_only'|'school_only'|'connections_only'|'private';

export interface User {
  id: UUID;
  displayName: string;
  avatarUrl?: string;
  trust: Trust;
  headline?: string;
  location?: string;
  industry?: string;
}

export interface School { id: UUID; name: string; city?: string; state?: string; country?: string; isVerified: boolean; }
export interface ClassYear { id: UUID; schoolId: UUID; year: number; }

export interface Yearbook { id: UUID; schoolId: UUID; classYearId?: UUID; title?: string; pageCount?: number; status: 'pending'|'clean'|'flagged'|'quarantined'|'processing'|'ready'; visibility: Visibility; createdAt: string; }
export interface YearbookPage { id: UUID; yearbookId: UUID; pageNumber: number; tileManifest?: string; imagePath?: string; }
export interface OcrText { id: UUID; pageId: UUID; text: string; bbox?: [number,number,number,number][]; }
export interface PageFace { id: UUID; pageId: UUID; bbox: [number,number,number,number]; claimedBy?: UUID | null; }

export interface Claim { id: UUID; userId: UUID; pageFaceId?: UUID; pageNameId?: UUID; status: 'pending'|'approved'|'rejected'; verifiedBy?: UUID; verifiedAt?: string; }

export interface Post { id: UUID; authorId: UUID; schoolId?: UUID; groupId?: UUID; visibility: Visibility; text?: string; media?: any; metrics?: { like_count?: number; comment_count?: number; share_count?: number; }; createdAt: string; }
export interface Comment { id: UUID; postId: UUID; authorId: UUID; text: string; createdAt: string; }

export interface Event { id: UUID; hostType: 'school'|'group'|'user'; hostId: UUID; title: string; startsAt: string; endsAt?: string; location?: string; isVirtual?: boolean; visibility: Visibility; ticketingEnabled: boolean; }
export interface EventTicket { id: UUID; eventId: UUID; name: string; priceCents: number; currency: 'USD'; quantity?: number; }

export interface Business { id: UUID; ownerId?: UUID; name: string; category?: string; website?: string; location?: string; perk?: string; isPremium?: boolean; verified?: boolean; }
export interface Job { id: UUID; postedBy?: UUID; title: string; company?: string; location?: string; remote?: boolean; description?: string; applyUrl?: string; visibility: Visibility; }

export interface Conversation { id: UUID; createdBy?: UUID; isGroup: boolean; title?: string; }
export interface Message { id: UUID; conversationId: UUID; senderId: UUID; text?: string; media?: any; createdAt: string; }

export interface Notification { id: UUID; userId: UUID; kind: string; payload: any; isRead: boolean; createdAt: string; }
```

---

## 2) Supabase RPC Contracts (Step 3 alignment)
```ts
// Yearbooks & Claims
export type RpcStartYearbookProcessing = (yearbookId: UUID) => Promise<{ ok: true }>;
export type RpcSubmitClaim = (args: { pageFaceId?: UUID; pageNameId?: UUID }) => Promise<Claim>;
export type RpcApproveClaim = (claimId: UUID) => Promise<{ status: 'approved' }>; // moderator only
export type RpcRejectClaim = (claimId: UUID) => Promise<{ status: 'rejected' }>;

// Feeds
export type RpcGetNetworkFeed = (cursor?: string) => Promise<{ items: Post[]; nextCursor?: string }>;
export type RpcGetForYouFeed = (cursor?: string) => Promise<{ items: Post[]; nextCursor?: string }>;

// Events
export type RpcCreateEvent = (payload: Partial<Event> & { tickets?: Partial<EventTicket>[] }) => Promise<Event>;
export type RpcPurchaseTicket = (args: { eventId: UUID; ticketId: UUID; qty: number }) => Promise<{ checkoutUrl: string }>;

// Reports / Moderation
export type RpcReportItem = (args: { targetTable: string; targetId: UUID; reason: string; details?: string }) => Promise<{ ok: true }>;

// Messaging
export type RpcSendMessage = (args: { conversationId: UUID; text?: string; media?: any }) => Promise<Message>;
```

---

## 3) Data Fetching Hooks (React Query wrappers)
```ts
export function useYearbook(yearbookId: UUID) { /* get yearbook + pages */ }
export function useYearbookPages(yearbookId: UUID) { /* list of pages */ }
export function useSubmitClaim() { /* mutation for claim */ }

export function useNetworkFeed(cursor?: string) { /* infinite query */ }
export function useForYouFeed(cursor?: string) { /* infinite query */ }

export function useMessages(conversationId: UUID) { /* realtime + query */ }
export function useSendMessage() { /* mutation */ }

export function useCreateEvent() { /* mutation */ }
export function usePurchaseTicket() { /* mutation */ }

export function useReportItem() { /* mutation */ }
export function useNotifications() { /* subscribe + query */ }
```

Each hook returns `{ data, isLoading, isError, error, mutate/mutateAsync }` and integrates optimistic updates where applicable.

---

## 4) Components by Feature

### A) Yearbooks

#### `YearbookUploadWizard`
- **Purpose:** Multi-step upload with safety disclosure and school/year assignment.
- **Props:**
  ```ts
  interface YearbookUploadWizardProps { onComplete?: (yearbookId: UUID) => void }
  ```
- **Steps:** Select files → Assign School & Year → TOS & Visibility → Upload → Processing state.
- **Behavior:**
  - Validates file types: PDF/JPG/PNG. Max size 500MB. Max pages 400.
  - Writes `yearbooks` row; uploads to `yearbooks-originals`; shows progress.
  - On insert success, trigger `RpcStartYearbookProcessing` (or rely on DB trigger).
  - Shows `Processing` status and email notice copy.
- **States:** idle / uploading / processing / error.
- **Edge cases:** duplicate upload detection (hash), large file chunking retries.

#### `YearbookExplorer`
- Grid of schools/years. Filters: state, era, type. Pagination.
- Card click → `YearbookReader`.

#### `YearbookReader`
- **Props:** `{ yearbookId: UUID; page?: number }`.
- **Internals:** Uses Deep Zoom viewer (e.g., OpenSeadragon) to load `tileManifest` per page.
- Overlays:
  - OCR highlight layer (toggle).
  - Face boxes (hover to reveal *Claim*).
  - Page thumbs rail; search-in-book input → highlights occurrences.
- **Actions:** Share snippet (generates preview), Report page, Claim face/name.
- **Empty/Loading/Error:** skeleton tiles → toast on failure.

#### `ClaimDialog`
- **Props:** `{ pageFaceId?: UUID; pageNameId?: UUID; open: boolean; onClose(): void }`.
- **Flow:** user confirms school/year → submit claim → pending badge on face/name.
- **Security:** throttle; show policy text; requires profile completion.

### B) Feeds & Posts

#### `FeedTabs`
- Switch between **Network** and **For You**; sticky on mobile.

#### `PostComposer`
- **Fields:** text, image/video upload, link preview, attach yearbook snippet, visibility selector.
- **Validations:** size/type; drag & drop; paste image clipboard.
- **API:** creates `posts` row + uploads media to `post-media`.

#### `PostCard`
- Author header (avatar, trust badge), content (text/media), actions (like/comment/share/report).
- Metrics shown with live increments (optimistic like).

#### `CommentList` & `CommentComposer`
- Infinite-scroll comments; optimistic add; @mentions (future).

### C) People & Network

#### `PeopleDiscover`
- Filters: school, year range, location, industry, mutuals. Sort: mutuals/recent.
- CTA: Connect; show privacy-aware preview.

#### `ConnectionButton`
- **States:** Not connected → Sent (pending) → Connected.
- Calls connections API; guards against duplicates.

### D) Messaging

#### `ThreadList`
- Shows conversations; unread badge; last message preview; search.

#### `ThreadView`
- Realtime message list; day separators; read receipts; typing indicators.

#### `MessageInput`
- Multi-line, attachments, enter-to-send; rate-limit.

### E) Events & Ticketing

#### `EventCreateWizard`
- Steps: Details → Tickets (optional) → Privacy → Review → Publish.
- On publish: `RpcCreateEvent`; if tickets, set up Stripe checkout via `RpcPurchaseTicket`.

#### `EventCard` / `EventPage`
- Card shows date, host, location, CTA. Page shows attendees, updates, chat (optional).

### F) Businesses, Jobs, Mentorship

#### `BusinessForm` / `BusinessCard`
- Create/claim business; alumni perk; premium badge.

#### `JobPostForm` / `JobCard`
- Post job; apply link; visibility control.

#### `MentorshipOptIn` / `MentorMatchCard`
- Choose mentor/mentee/both; topics; suggest pairings.

### G) Moderation & Safety

#### `ReportMenu`
- On posts/profiles/yearbook pages; selects reason → `RpcReportItem`.

#### `ModeratorInbox`
- Tabs: Reports, Yearbook Flags, Claims. Filters: reason, age, severity.
- Actions: approve/reject; notes stored to `moderation_actions`.

### H) Notifications

#### `NotificationsBell` / `NotificationsPanel`
- Realtime list; mark-as-read; route to targets.

### I) Profile & Settings

#### `ProfilePage`
- Tabs: About | Education | Activity | Photos | Yearbook Tags | Connections.
- Privacy toggles per section; connect CTA; claim prompts.

#### `VerificationCenter`
- Steps: confirm school/year, alumni email (optional), selfie-to-portrait (future), claim review status.

#### `SettingsPage`
- Account, Security (2FA), Privacy, Notifications, Data export/delete.

---

## 5) Routing & Code Splitting
```ts
// Example (React Router)
createBrowserRouter([
  { path: '/', element: <HomeLayout />, children: [
    { index: true, element: <FeedTabs /> },
    { path: 'yearbooks', element: <YearbookExplorer /> },
    { path: 'yearbooks/:id', element: <YearbookReader /> },
    { path: 'upload', element: <YearbookUploadWizard /> },
    { path: 'people', element: <PeopleDiscover /> },
    { path: 'messages/:id', element: <ThreadView /> },
    { path: 'events', element: <EventsDiscover /> },
    { path: 'events/create', element: <EventCreateWizard /> },
    { path: 'businesses', element: <BusinessesDiscover /> },
    { path: 'jobs', element: <JobsDiscover /> },
    { path: 'u/:username', element: <ProfilePage /> },
    { path: 'settings/*', element: <SettingsPage /> },
  ]},
]);
```
- Lazy-load pages via `React.lazy` and suspense boundaries per route.

---

## 6) UI States & Empty States
- **Home Feed (empty):** “Claim your yearbook photo to start finding classmates.” CTA → `VerificationCenter`.
- **Yearbooks (empty):** “No books yet. Upload yours to help classmates reconnect.”
- **Events (empty):** “No upcoming events. Create a reunion for your class.”
- **Messages (empty):** “Start a conversation with a classmate you find in People.”

---

## 7) Analytics Mapping (Event → Component)
- `yearbook_uploaded` → `YearbookUploadWizard`
- `scan_flagged` → background; toast in `YearbookReader` if your book is quarantined
- `ocr_done` / `faces_done` → background; notification badge
- `claim_started` / `claim_approved` → `ClaimDialog`
- `post_published` → `PostComposer`
- `event_created` / `ticket_purchased` → `EventCreateWizard` / `EventPage`
- `connection_accepted` → `ConnectionButton`

---

## 8) Example Hooks (pseudo-impl)
```ts
export function useSubmitClaim() {
  const client = useSupabase();
  return useMutation({
    mutationFn: async (p: { pageFaceId?: UUID; pageNameId?: UUID }) => {
      const { data, error } = await client.rpc('submit_claim', p);
      if (error) throw error; return data as Claim;
    },
  });
}

export function useNetworkFeed() {
  return useInfiniteQuery({
    queryKey: ['feed','network'],
    queryFn: async ({ pageParam }) => fetchRpc<RpcGetNetworkFeed>('get_network_feed', { cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useMessages(conversationId: UUID) {
  const client = useSupabase();
  const q = useQuery(['messages', conversationId], async () => {
    const { data } = await client.from('messages').select('*').eq('conversation_id', conversationId).order('created_at');
    return data as Message[];
  });
  useEffect(() => {
    const sub = client
      .channel(`messages:${conversationId}`)
      .on('postgres_changes',{ event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => [...old, payload.new as Message]);
      }).subscribe();
    return () => { client.removeChannel(sub); };
  }, [conversationId]);
  return q;
}
```

---

## 9) Testing Plan
- **Unit:** component rendering + props (Jest + React Testing Library).
- **Integration:** MSW to mock Supabase RPCs; simulate claim flow, posting, messaging.
- **E2E:** Playwright for core journeys: signup → add school → claim → connect → post → create event → buy ticket (mock Stripe).

---

## 10) Implementation Checklist (Frontend)
- [ ] Shell pages + routing + auth guard.
- [ ] Home feed with infinite-scroll + tabs.
- [ ] Post composer/card/comments with optimistic updates.
- [ ] Yearbook explorer + reader (Deep Zoom) + claim dialog.
- [ ] Upload wizard with progress + error handling.
- [ ] People discovery + connection flows.
- [ ] Messaging (threads + realtime) + notifications bell/panel.
- [ ] Events create/view + checkout handoff.
- [ ] Businesses/jobs/mentorship MVP forms & cards.
- [ ] Moderator inbox (basic) + report menu.
- [ ] Settings & verification center.
- [ ] Analytics events + Sentry instrumentation.

---

**Next Step (Step 5):** Execution plan & sprint backlog with priorities (P0/P1), resourcing (solo-founder friendly), and **low‑fi wireframes** for the Upload, Reader+Claim, Feed, Events Create, and People Discover screens.

