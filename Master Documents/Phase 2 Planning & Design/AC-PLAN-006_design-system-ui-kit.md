# Alumni Connect — Design System & UI Kit (Step 6)

**Owner:** Jose Tavarez  
**Author:** Product/Design  
**Version:** v1.0  
**Goal:** Provide a cohesive visual identity and reusable component library using Tailwind + shadcn/ui for Alumni Connect. Ensure consistent typography, spacing, colors, and card layouts across all modules (feeds, yearbooks, events, businesses, jobs, mentorship).

---

## 1. Design Principles
1. **Nostalgia + Modernity**: evoke yearbook vibes (serif type, subtle textures) while keeping feeds sleek and modern.
2. **Consistency**: unified card styles, typography, spacing tokens across modules.
3. **Accessibility**: WCAG AA contrast, scalable font sizes, 44px min touch targets.
4. **Scalability**: components built with variants (shadcn/ui) for easy reuse.

---

## 2. Tailwind Tokens
```ts
// tailwind.config.js theme.extend
colors: {
  brand: {
    50: '#f5f9ff',
    100: '#e0edff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  accent: {
    100: '#fef3c7',
    500: '#f59e0b',
    700: '#b45309',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    300: '#d4d4d8',
    700: '#3f3f46',
    900: '#18181b',
  }
},
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  serif: ['Merriweather', 'serif'],
},
spacing: { 0: '0', 1: '0.25rem', 2: '0.5rem', 4: '1rem', 6: '1.5rem', 8: '2rem', 12: '3rem' },
radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem' }
```

---

## 3. Typography Scale
- **Display**: `text-3xl font-bold tracking-tight`
- **H1**: `text-2xl font-semibold`
- **H2**: `text-xl font-semibold`
- **Body**: `text-base leading-relaxed`
- **Small**: `text-sm text-neutral-700`

Use `serif` headings in yearbook-related UIs for nostalgic feel; sans-serif everywhere else.

---

## 4. Core Components (shadcn/ui Variants)

### Card
```tsx
<Card variant="default|outlined|highlight">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```
- Default: neutral background, subtle shadow.  
- Outlined: border-neutral-300.  
- Highlight: brand-50 bg with brand-500 border.

### Button
```tsx
<Button variant="primary|secondary|ghost|destructive" size="sm|md|lg">
  Label
</Button>
```
- Primary: brand-600 bg, white text.  
- Secondary: neutral-100 bg, brand-600 text.  
- Ghost: transparent bg, hover brand-50.  
- Destructive: red-600 bg.

### Input / Select
- Rounded `md` radius, border-neutral-300, focus:ring-brand-500.

### Avatar
- Circle, fallback initials. Verified alumni = small brand check badge.

### Tabs
- Used in feeds (Network/For You), events (About/Attendees/Updates).

### Badge
- Variants: `verified`, `premium`, `eventHost`, `moderator`. Colors mapped to brand/accent.

---

## 5. Layout Patterns

### Feed Card
```
[Avatar] Name (badge)   ·   Time
--------------------------------
Post text...
[Image/Video]
[ Like ] [ Comment ] [ Share ]
```

### Yearbook Reader
```
[ Toolbar: < Back | Search | Claim | Report ]
[ Deep Zoom Page Viewer ]
[ OCR Highlights Layer | Face Boxes ]
```

### Event Card
```
[ Date Pill ]  Event Title
Host: School / Group
Location · CTA (Attend)
```

### Business Card
```
[ Logo/Avatar ]  Business Name (Premium badge)
Category · Location
Perk: Alumni discount
```

---

## 6. Figma / Storybook Library
- **Figma**: create a shared file with typography, color tokens, card layouts, and component variants.  
- **Storybook**: implement `Card`, `Button`, `Input`, `Avatar`, `Tabs`, `Badge` with stories for all variants + states.

---

## 7. Accessibility Checklist
- Color contrast: brand-600 on white passes AA.  
- All buttons: `aria-label` where icon-only.  
- Modals/Dialogs: focus trap + ESC to close.  
- Tabs: arrow key nav.  
- Forms: associate labels + error text.

---

## 8. Next Step (Step 7)
**Low-Fi → Hi-Fi Mockups in Figma**: Apply tokens + components to key flows (Upload Wizard, Reader, Feed, Events Create, People Discover). Then move to building Storybook components for dev handoff.

