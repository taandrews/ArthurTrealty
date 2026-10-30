# Arthur T Realty — Build Plan

**Project:** Lead generation demo website for Arthur T Realty (Maryland homeownership solutions)
**Purpose:** Client demo — functionality is visual only, no live AWS services
**Tech Stack:** Next.js (React), Tailwind CSS, deployed via AWS Amplify
**Built by:** Init One Solutions
**Images:** Use free and open-source images only (Unsplash, Pexels) — no stock photo purchases

---

## Phase 1: Project Setup

- [x] Initialize Git repo and push to GitHub
- [ ] Scaffold Next.js project with TypeScript
- [ ] Install dependencies: Tailwind CSS, Framer Motion, Lucide React icons, Google Fonts (Montserrat, Inter)
- [ ] Configure brand design tokens (colors, typography, spacing)
- [ ] Build reusable layout components: Header/Navbar, Footer, CTA Button, Lead Capture Form, Section Wrapper

### Brand Tokens
| Token | Value |
|-------|-------|
| Navy | `#0A1F44` |
| Gold | `#D4A017` |
| White | `#FFFFFF` |
| Light Gray | `#F5F6FA` |
| Headers | Montserrat / Poppins |
| Body | Inter / Open Sans |

---

## Phase 2: Core Pages (Build Order)

### Page 1: Homepage (`/`)
- Full-width hero with headline, subheadline, CTA button
- Trust bar with 3 stats
- 4 service pillar cards with icons
- "Which Path Is Right For You?" — 3-column credit range layout
- How It Works — 3-step visual
- Testimonials section (3-4 cards)
- Maryland county coverage section
- Closing CTA banner with email capture

### Page 2: Homeownership Readiness Quiz (`/quiz`)
- Multi-step quiz component with animated progress bar
- 7 questions with radio/dropdown inputs and back/next navigation
- Lead capture gate after Q7 (name, email, phone, TCPA checkbox)
- Results page with personalized pathway recommendation
- All logic is client-side for demo purposes

### Page 3: First Time Home Buyer (`/first-time-buyer`)
- Hero section
- MMP overview
- Program breakdown cards (4 programs)
- County-specific DPA section
- FAQ accordion (6+ questions)
- Lead capture form

### Page 4: Rent To Own (`/rent-to-own`)
- Hero section
- 3-step visual explainer
- Who it's for section
- What to expect section
- Interest form (name, email, phone, county, budget)
- MD Real Property §8-202 disclaimer

### Page 5: Turning Renters Into Homeowners (`/renters-to-homeowners`)
- Hero section
- 3-column credit pathway layout (680+, 580-679, below 580)
- Empowering, shame-free copy
- Quiz CTA
- Lead capture form

### Page 6: Credit Repair For Buyers (`/credit-repair`)
- Hero section
- Interactive rate comparison component (580 vs 720 score on $350K home)
- Credit repair process explainer
- CROA disclaimers
- Lead capture form

### Page 7: About (`/about`)
- Mission statement
- Who we serve section
- Maryland credibility section
- Team/founder placeholder section

### Page 8: Blog / Resources Hub (`/blog`)
- Grid layout with category filter tabs
- Sidebar with quiz CTA and lead magnet buttons
- 3-5 placeholder blog post cards
- Individual blog post template page

### Page 9: Contact (`/contact`)
- Contact form (name, email, phone, service dropdown, message)
- Business info display (phone, email, hours)
- Map placeholder

### Page 10: Admin Dashboard (`/admin`)
- Login screen (visual only — no real Cognito)
- Kanban pipeline board (New Lead → Contacted → Qualified → In Program → Referred → Closed)
- Lead detail modal/view with quiz answers, contact info, segment, drip step, notes
- Manual email/SMS trigger buttons (non-functional for demo)
- Basic reporting view (lead counts by segment, source, stage)

---

## Phase 3: Shared Components

- **Navbar** — Logo, nav links to all pages, mobile hamburger menu, "Get Started" CTA button
- **Footer** — Sitewide disclaimer, nav links, social media icons, copyright
- **LeadCaptureForm** — Reusable form with TCPA consent checkbox, used on every service page
- **ServiceCard** — Icon, title, description, CTA button
- **TestimonialCard** — Photo placeholder, name, quote, location
- **FAQAccordion** — Expandable Q&A component
- **StepCard** — Numbered step with icon and description
- **CreditComparison** — Interactive 580 vs 720 payment calculator
- **QuizStep** — Single quiz question component with radio/dropdown
- **ProgressBar** — Animated quiz progress indicator
- **CountyMap** — Visual representation of Maryland service coverage
- **KanbanBoard** — Drag-and-drop pipeline for admin dashboard
- **StatCard** — Reporting metric display

---

## Phase 4: Compliance & Legal Pages

- [ ] Privacy Policy placeholder (`/privacy`)
- [ ] Terms of Service placeholder (`/terms`)
- [ ] SMS Terms placeholder (`/sms-terms`)
- [ ] TCPA consent on all forms
- [ ] CROA disclaimer on Credit Repair page
- [ ] MD §8-202 disclaimer on Rent To Own page
- [ ] Sitewide footer disclaimer on every page

---

## Phase 5: SEO & Meta

- [ ] Unique title tags and meta descriptions per page
- [ ] Open Graph tags for social sharing
- [ ] JSON-LD schema: LocalBusiness (homepage), FAQPage (first-time buyer), HowTo (how it works)
- [ ] Alt text on all images
- [ ] Sitemap and robots.txt
- [ ] Semantic H1/H2 hierarchy

### Page Titles
| Page | Title |
|------|-------|
| Homepage | Arthur T Realty \| Maryland Homeownership Programs for Renters |
| First-Time Buyer | Maryland First Time Home Buyer Programs & Down Payment Assistance \| Arthur T Realty |
| Rent to Own | Rent to Own Homes in Maryland \| Arthur T Realty |
| Renters to Homeowners | Buy a Home in Maryland With Good, Bad or No Credit \| Arthur T Realty |
| Credit Repair | Credit Repair for Homebuyers in Maryland \| Arthur T Realty |

---

## Phase 6: Polish & Demo Prep

- [ ] Mobile responsiveness pass on all pages
- [ ] Smooth scroll and page transitions (Framer Motion)
- [ ] Loading states and micro-interactions
- [ ] Favicon and Open Graph image
- [ ] Final review of all copy and compliance text
- [ ] Push to `dev` branch, deploy via Amplify for client preview

---

## Backend (Stubbed for Demo)

The following are **not built** for the demo but are represented in the UI:

| Component | Demo Behavior |
|-----------|---------------|
| Quiz submission | Client-side scoring, no Lambda call |
| Lead forms | Toast confirmation, no API call |
| Drip sequences | Shown in admin dashboard as static data |
| DynamoDB tables | Mock data rendered in admin views |
| SES/SNS | Buttons visible in admin but non-functional |
| Cognito auth | Simulated login screen, no real auth |
| EventBridge | Referenced in architecture docs only |

---

## File Structure (Target)

```
arthur-t-realty/
├── public/
│   ├── images/
│   ├── pdfs/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Homepage
│   │   ├── quiz/page.tsx
│   │   ├── first-time-buyer/page.tsx
│   │   ├── rent-to-own/page.tsx
│   │   ├── renters-to-homeowners/page.tsx
│   │   ├── credit-repair/page.tsx
│   │   ├── about/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── sms-terms/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── TestimonialCard.tsx
│   │   │   ├── FAQAccordion.tsx
│   │   │   ├── StepCard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── forms/
│   │   │   ├── LeadCaptureForm.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── quiz/
│   │   │   ├── QuizStep.tsx
│   │   │   └── QuizResults.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── TrustBar.tsx
│   │   │   ├── CreditPathways.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   └── CountyCoverage.tsx
│   │   ├── credit-repair/
│   │   │   └── CreditComparison.tsx
│   │   └── admin/
│   │       ├── KanbanBoard.tsx
│   │       ├── LeadDetail.tsx
│   │       └── ReportingView.tsx
│   ├── data/
│   │   ├── counties.ts
│   │   ├── programs.ts
│   │   ├── testimonials.ts
│   │   ├── faq.ts
│   │   ├── drip-sequences.ts
│   │   └── mock-leads.ts
│   ├── lib/
│   │   ├── quiz-scoring.ts
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── BUILD_PLAN.md
├── README.md
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Notes

- This is a **demo build** — all backend interactions are mocked
- Priority is visual polish and UX flow to impress the client
- Mobile-first responsive design is critical — target audience browses on phones
- All compliance copy must be pixel-perfect and present on correct pages
- Admin dashboard should look functional even if data is static
