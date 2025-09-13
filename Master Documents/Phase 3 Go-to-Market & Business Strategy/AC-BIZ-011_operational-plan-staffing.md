# Alumni Connect — Operational Plan & Staffing (Step 11)

**Owner:** Jose Tavarez  
**Author:** Product/Operations  
**Version:** v1.0  
**Goal:** Define roles, workflows, and tooling needed to scale Alumni Connect with a lean team while maintaining growth, moderation, and platform reliability.

---

## 1. Team Structure (Lean Phase)
- **Founder/CEO (Jose):** product vision, fundraising, partnerships, growth strategy.
- **Full-Stack Engineer (1):** Supabase + React development, feature delivery.
- **Frontend Engineer (1):** UI components, mobile-first optimization, Storybook.
- **Backend/Infra Engineer (part-time/contract):** pipelines, workers, scaling.
- **Community Manager (1):** moderator recruitment, alumni engagement, support.
- **Designer (part-time/contract):** Figma mockups, brand identity, marketing assets.
- **Moderators (volunteer/ambassadors):** handle claims, reports, event support.

---

## 2. Key Workflows

### A) Product & Engineering
- **Sprints:** 2-week cycles, P0/P1 priorities from backlog.
- **Releases:** Vercel auto-deploy from `main`; feature flags for gradual rollout.
- **Code Reviews:** lightweight PR reviews by core engineer.
- **Monitoring:** Sentry for errors, GA4 for product analytics.

### B) Moderation & Community
- **Reports Inbox:** daily check of `moderation_reports`.
- **Claim Approvals:** moderators verify pending claims (target <48h).
- **Ambassador Program:** community manager recruits 2–3 per school cluster.
- **Escalations:** offensive content or disputes → founder review.

### C) Growth
- **Referral Tracking:** weekly cohort analysis (invites, claims).
- **Ambassador KPIs:** yearbooks uploaded, events organized, invites sent.
- **PR/Content:** weekly Throwback Thursday campaign + reunion press.
- **Partnerships:** school outreach pipeline managed in CRM (Notion/HubSpot free tier).

### D) Operations
- **Support:** shared inbox (HelpScout/Front) with response SLA <24h.
- **Finance:** Stripe payouts monthly; QuickBooks for bookkeeping.
- **Legal:** DMCA takedown process documented; privacy opt-out flow.
- **Security:** regular Supabase RLS policy review.

---

## 3. Tools & Platforms
- **Dev:** GitHub + Vercel + Supabase + Storybook.
- **Monitoring:** Sentry, GA4, Core Web Vitals via Vercel Analytics.
- **Ops:** Notion (project mgmt, CRM-lite), Slack/Discord (team comms).
- **Community:** Intercom/HelpScout (support), Loom (video tutorials).
- **Finance:** Stripe, QuickBooks.

---

## 4. Staffing Roadmap
- **Now (Bootstrapped):** Jose + 1 engineer (contract), moderators volunteer.
- **3–6 Months:** hire full-time frontend dev, part-time community manager.
- **6–12 Months:** backend/infra engineer (part-time), designer (contract ongoing).
- **12+ Months:** dedicated growth lead, full-time community team.

---

## 5. Daily Routines
- **Founder:** check metrics, approve claims escalations, manage partnerships.
- **Engineer:** code 4h/day, triage bugs, deploy weekly.
- **Community Manager:** review reports, onboard ambassadors, run campaigns.
- **Moderators:** approve/reject claims daily.

---

## 6. Scaling Plan
- **Moderation:** expand ambassador pool to 100+ by Year 1.
- **Engineering:** modularize backend pipelines; document workers for handoff.
- **Support:** automate FAQs with AI chatbot + escalate complex cases.
- **Growth:** double down on regional expansion playbook (Step 10).

---

## 7. Risks & Mitigation
- **Overload on Founder:** delegate early, automate reports & support.
- **Moderator Burnout:** rotate duties, reward with perks.
- **Technical Debt:** maintain backlog, allocate sprint % to refactor.
- **Scaling Costs:** monitor Supabase/Vercel usage; upgrade only when thresholds hit.

---

## 8. Next Step (Step 12)
**Financial Model & Fundraising Prep:** 3-year projections (users, revenue, costs), funding requirements, investor pitch structure.

