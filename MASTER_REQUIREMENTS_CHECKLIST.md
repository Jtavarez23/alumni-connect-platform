# Alumni Connect - Master Requirements Checklist
## Comprehensive Technical Implementation Audit

Generated from Master Documents Analysis
Last Updated: 2025-09-12

---

## 🏗️ ARCHITECTURE & INFRASTRUCTURE

### Database Schema (PostgreSQL/Supabase)
#### Core Tables
- [ ] `profiles` - Extended user profiles with trust levels
  - [ ] trust field (enum: unverified/verified_alumni/school_admin/moderator/staff)
  - [ ] is_private (boolean)
  - [ ] headline (text)
  - [ ] location (text)
  - [ ] industry (text)
- [ ] `schools` - School directory
  - [ ] name, nces_id, district, city, state, country
  - [ ] established_year, website, is_verified
  - [ ] Full-text search index (GIN)
- [ ] `school_aliases` - For merges/renames
- [ ] `class_years` - Cohort years within schools
- [ ] `user_education` - Education history
  - [ ] Links users to schools and class years
  - [ ] start_year, end_year, graduated
  - [ ] clubs[], teams[] arrays

#### Yearbook Pipeline Tables
- [ ] `yearbooks` - Main yearbook metadata
  - [ ] school_id, class_year_id, uploaded_by
  - [ ] storage_path, page_count
  - [ ] status (enum: pending/clean/flagged/quarantined/processing/ready)
  - [ ] ocr_done, face_done, is_public
  - [ ] visibility settings
- [ ] `yearbook_pages` - Individual pages
  - [ ] yearbook_id, page_number
  - [ ] tile_manifest, image_path
  - [ ] Unique constraint on yearbook_id + page_number
- [ ] `page_names_ocr` - OCR extracted text
  - [ ] page_id, bbox ranges, text
  - [ ] Full-text search index (GIN)
- [ ] `page_faces` - Detected faces
  - [ ] page_id, bbox, embedding (vector 256)
  - [ ] claimed_by reference
- [ ] `claims` - User claims on photos/names
  - [ ] user_id, page_face_id, page_name_id
  - [ ] status (pending/approved/rejected)
  - [ ] verified_by, verified_at
- [ ] `yearbook_flags` - Content moderation flags
- [ ] `safety_queue` - Media scanning queue
  - [ ] status, findings (jsonb)

#### Social Features Tables
- [ ] `posts` - User posts
  - [ ] author_id, school_id, group_id
  - [ ] visibility settings
  - [ ] text, media (jsonb)
  - [ ] metrics (jsonb: like_count, comment_count, share_count)
  - [ ] Full-text search index
- [ ] `comments` - Post comments
- [ ] `reactions` - Post reactions/likes
  - [ ] Composite primary key (post_id, user_id)
- [ ] `connections` - Alumni network
  - [ ] user_id, connection_id
  - [ ] status (pending/accepted/rejected/blocked)
  - [ ] Unique constraint

#### Groups & Communities
- [ ] `groups` - Groups/clubs/classes
  - [ ] school_id, name, kind (class/club/team/custom)
  - [ ] visibility, created_by
- [ ] `group_members` - Membership
  - [ ] role (owner/admin/member)
  - [ ] Composite primary key

#### Events & Ticketing
- [ ] `events` - Event listings
  - [ ] host_type (school/group/user), host_id
  - [ ] title, description, starts_at, ends_at
  - [ ] location, is_virtual
  - [ ] ticketing_enabled
- [ ] `event_tickets` - Ticket tiers
  - [ ] price_cents, currency, quantity
  - [ ] sales_start, sales_end
- [ ] `event_orders` - Ticket purchases
  - [ ] purchaser_id, ticket_id, qty
  - [ ] stripe_payment_intent
  - [ ] status (created/paid/refunded/canceled)
- [ ] `event_attendees` - RSVPs
  - [ ] status (interested/going/declined)

#### Business & Professional
- [ ] `businesses` - Alumni businesses
  - [ ] owner_id, name, category
  - [ ] website, location, perk
  - [ ] is_premium, verified
- [ ] `business_claims` - Ownership claims
- [ ] `business_listings` - Premium/boosted listings
- [ ] `jobs` - Job postings
  - [ ] posted_by, title, company
  - [ ] location, remote, description
  - [ ] apply_url, visibility
- [ ] `job_applications` - Application tracking
- [ ] `mentorship_profiles` - Mentor/mentee profiles
  - [ ] role (mentor/mentee/both)
  - [ ] topics[], availability (jsonb)
- [ ] `mentorship_matches` - Pairing suggestions

#### Messaging & Notifications
- [ ] `conversations` - Message threads
  - [ ] created_by, is_group, title
- [ ] `conversation_members` - Thread participants
  - [ ] role (owner/admin/member)
- [ ] `messages` - Individual messages
  - [ ] conversation_id, sender_id
  - [ ] text, media (jsonb)
- [ ] `notifications` - User notifications
  - [ ] kind, payload (jsonb), is_read
  - [ ] Index on user_id + is_read

#### Moderation & Safety
- [ ] `moderation_reports` - User reports
  - [ ] reporter_id, target_table, target_id
  - [ ] reason (enum), details
  - [ ] status (open/reviewing/closed)
- [ ] `moderation_actions` - Moderator actions
  - [ ] report_id, moderator_id
  - [ ] action, notes
- [ ] `safety_events` - Audit log
- [ ] `throttle_events` - Rate limiting

### Storage Buckets
- [ ] `yearbooks-originals` (private) - Raw uploads
- [ ] `yearbooks-tiles` (public) - Watermarked tiles
- [ ] `yearbooks-previews` (public) - Low-res previews
- [ ] `post-media` (public) - Post attachments
- [ ] `avatars` (public) - Profile pictures

### Row Level Security (RLS)
- [ ] Schools - Public read
- [ ] Profiles - Read public fields, write own
- [ ] Yearbooks - Visibility-based access
- [ ] Claims - Insert by claimant, approve by moderator
- [ ] Posts - Visibility + connections based
- [ ] Messages - Conversation members only
- [ ] Moderation - Staff/moderator only

---

## 🔧 BACKEND SERVICES & PIPELINES

### Edge Functions (Supabase/Deno)
- [ ] `worker-safety-scan` - NSFW/violence detection
  - [ ] NSFW.js or ONNX Runtime integration
  - [ ] Quarantine flagged content
- [ ] `worker-ocr` - Text extraction
  - [ ] PDF to image conversion
  - [ ] Tesseract OCR with hOCR bounding boxes
  - [ ] Name extraction heuristics
- [ ] `worker-faces` - Face detection
  - [ ] OpenCV Haar cascade
  - [ ] Store bounding boxes
  - [ ] Future: pgvector embeddings
- [ ] `worker-tiler` - Deep Zoom generation
  - [ ] VIPS dzsave or IIIF manifest
  - [ ] Watermark overlay
  - [ ] Predictable path structure

### Scheduled Jobs (Cron)
- [ ] `cron-refresh-trending` - Every 5 minutes
- [ ] `cron-digest-weekly` - Wednesday 10AM local
- [ ] `cron-cleanup` - Nightly maintenance

### RPC Functions (PostgreSQL)
- [ ] `start_yearbook_processing(yearbook_id)`
- [ ] `submit_claim(page_face_id?, page_name_id?)`
- [ ] `approve_claim(claim_id)` - Moderator only
- [ ] `reject_claim(claim_id)`
- [ ] `get_network_feed(cursor?)` - Keyset pagination
- [ ] `get_foryou_feed(cursor?)`
- [ ] `create_event(...)` - With role validation
- [ ] `purchase_ticket(event_id, ticket_id, qty)`
- [ ] `report_item(target_table, target_id, reason)`
- [ ] `send_message(conversation_id, text?, media?)`
- [ ] `can_post()` - Rate limiting check

### Webhooks
- [ ] Stripe payment webhook handler
- [ ] Email provider bounce handling

### Processing Pipeline Flow
1. [ ] Upload triggers safety scan
2. [ ] Safety scan → OCR if clean
3. [ ] OCR → Face detection
4. [ ] Face detection → Tiling
5. [ ] Tiling → Ready status

---

## 🎨 FRONTEND COMPONENTS

### Core Navigation
- [ ] Mobile bottom tab bar (5 tabs)
  - [ ] Home (dual feed)
  - [ ] Yearbooks
  - [ ] Network
  - [ ] Messages
  - [ ] Profile
- [ ] Desktop left sidebar + top bar
- [ ] Global search (sticky top)
- [ ] Floating create button (+)

### Yearbook Components
- [ ] `YearbookUploadWizard`
  - [ ] File selection (PDF/JPG/PNG)
  - [ ] School/year assignment
  - [ ] TOS acceptance
  - [ ] Progress tracking
  - [ ] 500MB file limit
- [ ] `YearbookExplorer`
  - [ ] Browse by school → year
  - [ ] Filters: state, district, era
  - [ ] Grid layout with pagination
- [ ] `YearbookReader`
  - [ ] Deep Zoom viewer (OpenSeadragon)
  - [ ] OCR text overlay toggle
  - [ ] Face detection boxes
  - [ ] Page thumbnails
  - [ ] Search-in-book
  - [ ] Share snippet tool
- [ ] `ClaimDialog`
  - [ ] Face/name selection
  - [ ] School/year confirmation
  - [ ] Throttling/rate limits

### Feed Components
- [ ] `FeedTabs` - Network/For You switcher
- [ ] `PostComposer`
  - [ ] Text, image/video upload
  - [ ] Link preview
  - [ ] Yearbook snippet attachment
  - [ ] Visibility selector
- [ ] `PostCard`
  - [ ] Author header with trust badge
  - [ ] Content (text/media)
  - [ ] Like/comment/share actions
  - [ ] Report menu
- [ ] `CommentList` - Infinite scroll
- [ ] `CommentComposer` - Optimistic updates

### Network Components
- [ ] `PeopleDiscover`
  - [ ] Filters: school, year, location, industry
  - [ ] Sort: mutuals, recent
  - [ ] Privacy-aware previews
- [ ] `ConnectionButton`
  - [ ] States: not connected/pending/connected
- [ ] `GroupList` - Classes, clubs, custom
- [ ] `GroupMembers` - Role management

### Events Components
- [ ] `EventCreateWizard`
  - [ ] Multi-step form
  - [ ] Ticket tier configuration
  - [ ] Stripe integration
- [ ] `EventCard` - Preview with date pill
- [ ] `EventPage`
  - [ ] Details, attendees, updates
  - [ ] Ticket purchase flow
- [ ] `EventCalendar` - Month/week views

### Business Directory
- [ ] `BusinessForm` - Create/claim listing
- [ ] `BusinessCard` - With alumni perk
- [ ] `BusinessDirectory` - Search/filter
- [ ] Premium badge display

### Jobs & Mentorship
- [ ] `JobPostForm` - Create posting
- [ ] `JobCard` - With apply link
- [ ] `JobBoard` - Filter/search
- [ ] `MentorshipOptIn` - Profile setup
- [ ] `MentorMatchCard` - Pairing suggestions

### Messaging
- [ ] `ThreadList` - Conversation list
- [ ] `ThreadView` - Real-time messages
- [ ] `MessageInput` - With attachments
- [ ] Typing indicators
- [ ] Read receipts

### Notifications
- [ ] `NotificationsBell` - With badge count
- [ ] `NotificationsPanel` - Real-time updates
- [ ] Mark as read functionality

### Profile & Settings
- [ ] `ProfilePage`
  - [ ] Tabs: About/Education/Activity/Photos/Tags
  - [ ] Privacy toggles per section
  - [ ] Connection CTA
- [ ] `VerificationCenter`
  - [ ] School/year confirmation
  - [ ] Alumni email verification
  - [ ] Claim status tracking
- [ ] `SettingsPage`
  - [ ] Account, Security (2FA)
  - [ ] Privacy, Notifications
  - [ ] Data export/delete

### Moderation
- [ ] `ReportMenu` - On all content
- [ ] `ModeratorInbox` - Queue management
- [ ] `ModerationActions` - Approve/reject/ban

---

## 📱 MOBILE APP (React Native/Expo)

### Core Features
- [ ] React Native + Expo setup
- [ ] Push notifications (Expo Push)
- [ ] Touch gestures for yearbook reader
  - [ ] Pinch to zoom
  - [ ] Pan navigation
  - [ ] Double-tap zoom
- [ ] Camera integration for uploads
- [ ] Native share functionality

### Mobile-Specific Components
- [ ] Bottom tab navigation
- [ ] Swipe-friendly feeds
- [ ] Native image picker
- [ ] Push notification handlers
- [ ] Deep linking support

### Testing Suite
- [ ] Jest unit tests
- [ ] Detox E2E tests
- [ ] TypeScript compilation
- [ ] Linting configuration

---

## 🔐 SECURITY & SAFETY

### Content Safety
- [ ] Upload-time scanning (nudity/violence)
- [ ] Quarantine system for flagged content
- [ ] NSFW.js or similar integration
- [ ] Manual review queue

### User Safety
- [ ] Report system (all content types)
- [ ] Block/mute functionality
- [ ] Rate limiting (posts, messages, claims)
- [ ] IP throttling
- [ ] Link scanning for malicious URLs

### Privacy Controls
- [ ] Privacy-by-default settings
- [ ] Profile section visibility toggles
- [ ] Connection-based content access
- [ ] School/class-based access
- [ ] Opt-out for face tags

### Moderation Tools
- [ ] Report categories (impersonation, inappropriate, copyright, spam)
- [ ] Moderator roles and permissions
- [ ] Action audit trail
- [ ] DMCA takedown workflow
- [ ] Appeal process

---

## 📊 ANALYTICS & METRICS

### Event Tracking
- [ ] `auth_signup`
- [ ] `education_added`
- [ ] `yearbook_uploaded`
- [ ] `scan_flagged`
- [ ] `ocr_done`
- [ ] `face_detected`
- [ ] `claim_started`
- [ ] `claim_verified`
- [ ] `connection_sent`
- [ ] `connection_accepted`
- [ ] `post_published`
- [ ] `event_created`
- [ ] `ticket_purchased`
- [ ] `listing_created`
- [ ] `job_posted`
- [ ] `mentorship_optin`

### Metrics Dashboard
- [ ] Daily Active Users (DAU)
- [ ] Yearbooks uploaded count
- [ ] Claims approved rate
- [ ] Viral coefficient (invites per claim)
- [ ] Connection acceptance rate
- [ ] Event creation/attendance
- [ ] Message volume

### Performance Metrics
- [ ] LCP < 2.5s
- [ ] TTI < 3s mobile
- [ ] Feed card < 80KB including media
- [ ] Reader tile loading performance

---

## 🚀 DEPLOYMENT & OPERATIONS

### Infrastructure
- [ ] Supabase configuration
  - [ ] Database migrations
  - [ ] RLS policies
  - [ ] Edge functions deployment
  - [ ] Storage buckets setup
- [ ] Vercel deployment
  - [ ] Environment variables
  - [ ] Preview deployments
  - [ ] Production deployment
- [ ] CDN configuration for media

### Monitoring
- [ ] Sentry error tracking
- [ ] GA4 analytics
- [ ] Structured logging
- [ ] Request tracing (request_id)
- [ ] Performance monitoring

### CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Automated testing
- [ ] Build verification
- [ ] Deployment automation
- [ ] Rollback procedures

### Backup & Recovery
- [ ] Database backups
- [ ] Media storage backups
- [ ] Disaster recovery plan
- [ ] Data export functionality

---

## 💰 MONETIZATION FEATURES

### Event Ticketing
- [ ] Stripe integration
- [ ] Payment processing
- [ ] Refund handling
- [ ] Ticket QR codes

### Premium Features
- [ ] Business listing boosts
- [ ] Premium badges
- [ ] Enhanced visibility
- [ ] Advanced analytics

### Future Monetization
- [ ] Job posting fees
- [ ] Mentorship matching premium
- [ ] Alumni perks marketplace
- [ ] Sponsored content

---

## 🌐 INTERNATIONALIZATION & ACCESSIBILITY

### i18n Support
- [ ] Locale-aware dates
- [ ] RTL support preparation
- [ ] Copy externalization
- [ ] Name formatting

### Accessibility (WCAG AA)
- [ ] 44px minimum touch targets
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast theme option
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Alt text for images

---

## 📋 LAUNCH REQUIREMENTS

### Pre-Launch
- [ ] 50-100 seed yearbooks
- [ ] 20+ beta ambassadors
- [ ] 1000+ email signups
- [ ] Press kit ready
- [ ] Social media templates

### Launch Day
- [ ] Landing page live
- [ ] Press release distribution
- [ ] Email blast system
- [ ] Virtual launch event
- [ ] Monitoring dashboard

### Post-Launch
- [ ] Growth metrics tracking
- [ ] Ambassador program
- [ ] Geo-targeted marketing
- [ ] Feature roadmap execution

---

## 🔄 FEEDS & ALGORITHMS

### Feed Types
- [ ] Network feed (connections + school)
- [ ] For You feed (trending + affinity)

### Ranking Signals
- [ ] Recency (time decay)
- [ ] Engagement (likes, comments, shares)
- [ ] Author trust level
- [ ] Same-school boost
- [ ] Same-year boost
- [ ] Group membership
- [ ] Safety score

### Materialized Views
- [ ] `mv_trending` - Refreshed every 5 min
- [ ] Wilson score + time decay algorithm

---

## 📝 DOCUMENTATION

### Technical Documentation
- [ ] API documentation
- [ ] Database schema docs
- [ ] Component library docs
- [ ] Deployment guide
- [ ] Security policies

### User Documentation
- [ ] Getting started guide
- [ ] Uploading yearbooks guide
- [ ] Claiming photos guide
- [ ] Creating events guide
- [ ] Privacy settings guide

---

## 🎯 PERFORMANCE REQUIREMENTS

### Page Load Times
- [ ] LCP < 2.5 seconds
- [ ] TTI < 3 seconds on mobile
- [ ] Feed card < 80KB with media

### Scalability
- [ ] Support 10,000+ concurrent users
- [ ] Handle 400-page yearbooks
- [ ] Process multiple uploads simultaneously
- [ ] Real-time messaging at scale

### Storage Limits
- [ ] 500MB per yearbook file
- [ ] 400 pages maximum per book
- [ ] Image optimization pipeline
- [ ] Tile caching strategy

---

## ✅ COMPLETION STATUS SUMMARY

Total Requirements: ~400+
Categories:
- Database & Schema: 50+ tables/fields
- Backend Services: 20+ functions
- Frontend Components: 60+ components
- Security & Safety: 15+ features
- Analytics: 20+ events
- Mobile App: 10+ features
- Launch Requirements: 15+ items

This checklist should be used to audit the codebase and ensure all features from the master documents are implemented.