# Alumni Connect — Hi-Fi Mockups & Component Handoff (Step 7)

**Owner:** Jose Tavarez  
**Author:** Product/Design  
**Version:** v1.0  
**Goal:** Move from low-fi wireframes + design system (Step 6) to hi-fi mockups in Figma and Storybook-ready components for developer handoff. Ensure consistent application of tokens, components, and accessibility guidelines.

---

## 1. Figma Mockups (Hi-Fi)

### Key Screens
1. **Onboarding & Upload Wizard**
   - Modern gradient background (brand-500 → brand-700).
   - Card-centered wizard with progress dots.
   - Yearbook nostalgia detail: subtle background texture (paper grain).

2. **Yearbook Reader**
   - Toolbar with brand-colored claim button.
   - Deep Zoom viewer with OCR highlight toggle.
   - Claim dialog modal with user avatar + school/year confirmation.

3. **Feed (Network & For You)**
   - Tab switcher styled as segmented control.
   - Post cards with media preview and rounded corners.
   - Engagement buttons with brand hover effects.

4. **Events Create & Detail**
   - Multi-step form wizard (title, details, tickets, review).
   - Event card with date pill on left, title + host info.
   - CTA buttons styled primary (brand-600 bg).

5. **People Discover**
   - Filters in collapsible sidebar.
   - User cards with avatars, grad year, connect button.
   - Verified badge next to alumni names.

6. **Messaging**
   - Conversation list left pane, thread right pane.
   - Input bar with attachment and emoji buttons.
   - Typing indicator dots.

7. **Profile Page**
   - Hero header with cover photo option.
   - Tabs: About | Education | Yearbook Tags | Connections.
   - Claim badge visible when user links yearbook photo.

---

## 2. Storybook Components

### Atoms
- Button (variants, sizes, states)
- Input / Select / Textarea
- Avatar (fallback, badge overlays)
- Badge (verified, premium, moderator)
- Tabs (horizontal, vertical)
- Card (default, outlined, highlight)

### Molecules
- PostCard
- EventCard
- BusinessCard
- JobCard
- UserCard
- NotificationItem

### Organisms
- Feed (infinite scroll)
- YearbookReader (Deep Zoom embed)
- EventCreateWizard
- MessageThread
- ModerationDashboard

---

## 3. Component Props (Standardized)
- Every component receives:
  - `data` (typed interface from Step 4 contracts).
  - `onAction` callbacks for mutations.
  - `variant` prop for UI style differences.
- Example:
```tsx
<PostCard data={post} onLike={...} onComment={...} onShare={...} />
```

---

## 4. Accessibility in Mockups
- Ensure sufficient contrast in mockups (brand-600 on white passes AA).
- Keyboard focus outlines visible.
- Dialog modals in Figma show focus trap order.

---

## 5. Developer Handoff Process
1. Figma file: publish tokens, components, mockups.
2. Storybook: implement atomic components with Tailwind + shadcn/ui.
3. Developers build pages by composing Storybook components.
4. QA: visual regression tests with Chromatic or Playwright.

---

## 6. Milestone Deliverables
- Figma file with hi-fi mockups for 7 key flows.
- Storybook library with 15+ components (atoms → organisms).
- Documentation on props, usage, accessibility.
- Demo build with feed, reader, events, and messages working.

---

## 7. Next Step (Step 8)
**Go-To-Market Launch Plan**: outline onboarding strategy, viral loops (photo claims, invites), moderator recruitment, and monetization pilot (events + business directory).

