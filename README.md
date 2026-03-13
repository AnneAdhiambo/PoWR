# PoWR — Proof-of-Work Reputation Platform
## Technical Specification v2.0 — Stacks Native

> **Status:** Implementation-Ready  
> **Version:** 2.0.0  
> **Date:** March 2026  
> **Network:** Stacks Mainnet (Bitcoin L2)  
> **Stack:** Next.js 14 · Clarity 2.0 · Supabase · Hiro Platform · Stripe  
> **Audience:** Engineers · Designers · Stakeholders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & User Personas](#2-product-vision--user-personas)
3. [System Architecture](#3-system-architecture)
4. [User Interface Specifications](#4-user-interface-specifications)
   - 4.1 [Developer Dashboard](#41-developer-dashboard)
   - 4.2 [Admin Dashboard](#42-admin-dashboard)
   - 4.3 [Recruiter / Hiring Portal](#43-recruiter--hiring-portal)
   - 4.4 [Public Developer Profile](#44-public-developer-profile)
   - 4.5 [Onboarding Flow](#45-onboarding-flow)
5. [Database Schema](#5-database-schema)
6. [Smart Contracts — Clarity 2.0](#6-smart-contracts--clarity-20)
7. [Hiro Platform Integration](#7-hiro-platform-integration)
8. [Contribution Analysis Engine](#8-contribution-analysis-engine)
9. [Subscription & Billing](#9-subscription--billing)
10. [API Route Contracts](#10-api-route-contracts)
11. [Security Requirements](#11-security-requirements)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Roadmap](#14-roadmap)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

PoWR (Proof-of-Work Reputation) is a **Bitcoin-native reputation and hiring signal platform** that replaces resumes and interviews with cryptographically verifiable, artifact-backed evidence of real developer work. Built natively on the Stacks blockchain — a Bitcoin Layer 2 — every contribution is anchored to Bitcoin's immutable ledger, providing employers and recruiters with trustless, tamper-evident proof of a developer's actual capabilities.

PoWR serves three distinct user groups:

| User Type | Core Need | PoWR Solution |
|---|---|---|
| **Developer** | Prove real skills without interviews | On-chain work artifacts, verified contribution history, skill badges |
| **Recruiter / Hiring Manager** | Find candidates with verified domain expertise | Searchable talent pool filtered by verified skill domain, trust score, and contribution type |
| **Platform Admin** | Monitor platform health, revenue, and quality | Real-time metrics dashboard, subscription management, fraud detection |

### Why Stacks — Not a Generic L2

| Concern | Why Stacks Is the Right Choice |
|---|---|
| Bitcoin security | Every Stacks transaction is anchored to a Bitcoin block via Proof of Transfer (PoX). PoWR reputation records inherit Bitcoin's finality — the most secure settlement layer in crypto. |
| Clarity language | Decidable, interpreted smart contracts. A PoWR contract's behavior is fully auditable before execution. No hidden reentrancy, no infinite loops, no surprises. |
| sBTC | Native Bitcoin on Stacks enables future staking mechanics and incentive layers without bridging to a separate chain. |
| Identity via BNS | Bitcoin Name System (BNS) allows developers to use human-readable names (e.g. `sudoevans.btc`) as their PoWR identity — no separate ENS or DNS setup. |
| Nakamoto upgrade | Post-Nakamoto, Stacks transactions achieve Bitcoin-anchored finality rapidly, making UX viable for production applications. |

---

## 2. Product Vision & User Personas

### 2.1 Persona: The Developer (Primary)

**Name:** Evans  
**Role:** Full-stack / DevOps engineer, 4 years experience  
**Pain:** Spends hours tailoring resumes. Fails technical screens despite strong GitHub history. Cannot prove NDA-protected work.  
**Goal:** Let verifiable work speak for itself. Build a living proof-of-work profile that grows automatically as he ships code.  
**PoWR Use:** Connects GitHub and Stacks wallet on signup. Receives initial analysis. Publishes on-chain proofs. Shares public profile link with employers.

### 2.2 Persona: The Recruiter (Secondary)

**Name:** Amara  
**Role:** Technical Talent Acquisition, Series B startup  
**Pain:** 60% of candidates who pass resume screen fail technical evaluation. Cannot distinguish real engineers from certification collectors.  
**Goal:** Find engineers with verifiable DevOps or backend depth in under 10 minutes.  
**PoWR Use:** Searches talent pool by domain (DevOps), minimum trust score, and specific tools (Kubernetes, Terraform). Reviews verified artifacts before reaching out.

### 2.3 Persona: The Admin

**Name:** Platform Team  
**Role:** PoWR internal operations  
**Goal:** Monitor platform health, track MRR/churn, review flagged profiles, manage subscription tiers.  
**PoWR Use:** Admin dashboard with real-time metrics, user management, fraud queue, revenue analytics.

---

## 3. System Architecture

### 3.1 Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│     Next.js 14 App Router · TypeScript · Tailwind CSS           │
│   Developer UI  │  Recruiter Portal  │  Admin Dashboard         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                       APPLICATION LAYER                          │
│              Next.js API Routes (Edge + Node.js)                 │
│   Auth  │  Analysis Engine  │  Webhook Handlers  │  Billing     │
└──────┬───────────────────────────────┬────────────────┬─────────┘
       │                               │                │
┌──────▼──────┐          ┌─────────────▼──────┐  ┌────▼──────────┐
│  BLOCKCHAIN  │          │    DATA LAYER       │  │  EXTERNAL     │
│   LAYER      │          │  Supabase Postgres  │  │  SERVICES     │
│              │          │                     │  │               │
│ Stacks       │          │  users              │  │ GitHub API    │
│ Mainnet      │          │  subscriptions      │  │ Stripe        │
│              │          │  snapshots          │  │ Hiro Platform │
│ powr-        │◄────────►│  work_artifacts     │  │ Chainhook     │
│ registry     │ Chainhook│  badges             │  │               │
│ .clar        │ events   │  revenue_events     │  │               │
│              │          │  recruiter_saves    │  │               │
│ powr-        │          │  job_postings       │  │               │
│ badges       │          └─────────────────────┘  └───────────────┘
│ .clar        │
└─────────────┘
```

### 3.2 Request Lifecycle — Developer Publishes a Proof

1. Developer pushes code to GitHub (Pro: webhook fires instantly; Basic: next Monday cron; Free: next 14-day cron)
2. Analysis engine fetches delta from GitHub REST API v3 — only commits/PRs since last snapshot
3. Domain classifier tags each file change: `backend | frontend | devops | systems | contracts`
4. Trust score and domain scores computed off-chain; new `snapshot` row written to Supabase
5. Frontend displays **"Unpublished Updates"** banner with diff of score changes
6. Developer clicks **"Publish Now"** — frontend calls `submit-artifact` on `powr-registry.clar` via `@stacks/connect`
7. Transaction submitted to Stacks Mainnet; frontend shows pending state with tx hash
8. Hiro Chainhook detects `submit-artifact` contract call; fires POST to `/api/chainhook/artifact`
9. API route marks snapshot `published_to_chain: true`, stores `stacks_tx_id` and `block_height`
10. If badge thresholds crossed, oracle wallet calls `mint-badge` on `powr-badges.clar`
11. Developer's public profile updates with new trust score, domain scores, and any new badges

### 3.3 Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | Next.js | 14.x (App Router) | UI, SSR, API routes |
| Language | TypeScript | 5.x | Type safety across all layers |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Blockchain SDK | @stacks/connect | ^7.x | Wallet connection, tx signing |
| Blockchain SDK | @stacks/transactions | ^6.x | Clarity value encoding, tx building |
| Blockchain SDK | @stacks/network | ^6.x | Mainnet/testnet network config |
| Blockchain Data | Hiro Stacks API | v2 | Read-only chain queries |
| Event Streaming | Hiro Chainhook | 2.0 | Real-time contract event webhooks |
| Contract Dev | Clarinet | v2.x | Local development, simnet, testing |
| Database | Supabase (Postgres 15) | Latest | Off-chain state, RLS |
| Auth | @stacks/connect + Supabase | — | Wallet-based auth, session management |
| Payments | Stripe Billing | 2024+ | Subscriptions, webhooks, portal |
| Hosting | Vercel | — | Frontend, API routes, cron jobs |
| Monitoring | Sentry | — | Error tracking, performance |

---

## 4. User Interface Specifications

> All UI dimensions are defined for a **1440px desktop viewport** as primary, with responsive breakpoints at 1024px (tablet) and 375px (mobile). Dark mode is the default theme for the developer dashboard. Light mode is available. The recruiter portal defaults to light mode.

---

### 4.1 Developer Dashboard

The developer dashboard is the primary interface for authenticated developers. It is divided into a persistent left sidebar and a main content area.

#### 4.1.1 Layout Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                                │
│  [PoWR logo]           [Refresh Analysis ↻]    [Wallet: sudoevans.btc]│
├──────────────┬─────────────────────────────────┬───────────────────────┤
│  SIDEBAR     │  MAIN CONTENT AREA              │  RIGHT PANEL          │
│  (240px)     │  (flex-1)                       │  (280px)              │
│              │                                 │                       │
│  Dashboard   │  [Active View renders here]     │  Recent Activity      │
│  On-Chain    │                                 │  Subscription         │
│    Proofs    │                                 │  Suggested Jobs       │
│  Jobs        │                                 │                       │
│  Gigs        │                                 │                       │
│  Saved       │                                 │                       │
│  Chat        │                                 │                       │
│  Notif.      │                                 │                       │
│              │                                 │                       │
│  ──────────  │                                 │                       │
│  [Avatar]    │                                 │                       │
│  sudoevans   │                                 │                       │
│  @sudoevans  │                                 │                       │
│  Upgrade Pro │                                 │                       │
└──────────────┴─────────────────────────────────┴───────────────────────┘
```

#### 4.1.2 Sidebar Navigation

| Route | Icon | Label | Badge |
|---|---|---|---|
| `/dashboard` | grid | Dashboard | — |
| `/dashboard/proofs` | shield | On-Chain Proofs | Count of unpublished |
| `/dashboard/jobs` | briefcase | Jobs | — |
| `/dashboard/gigs` | zap | Gigs | — |
| `/dashboard/saved` | bookmark | Saved | — |
| `/dashboard/chat` | message-circle | Chat | Unread count |
| `/dashboard/notifications` | bell | Notifications | Unread count |

Bottom of sidebar:
- Avatar + display name + handle
- Plan badge (Free / Basic / Pro)
- "Upgrade to Pro" CTA button (hidden if already Pro)

#### 4.1.3 Dashboard Home — Component Specifications

**Component: Trust Score Widget**
- Position: Top-left of main content area
- Size: 200px × 170px card
- Content: Circular progress ring (0–100), large score number centered, label "Trust Score" below
- Ring color: `#F7931A` (Bitcoin orange) at score ≥ 70; `#3B82F6` at 40–69; `#EF4444` at < 40
- Animate ring fill on page load (0 → score, 800ms ease-out)
- Tooltip on hover: "Your trust score is a weighted composite of contribution depth, consistency, and verifiability. Updated [date]."

**Component: Stats Row**
Three equal-width stat cards immediately right of Trust Score Widget.

| Card | Icon | Metric | Color |
|---|---|---|---|
| Repos Analyzed | github-icon | `repos_analyzed` | Teal |
| PRs Merged | git-merge | `prs_merged` | Purple |
| Total Commits | git-commit | `total_commits` | Orange |

Each card: 170px wide, 90px tall, metric displayed as large number, label below, icon top-left.

**Component: Skill Percentiles Radar Chart**
- Position: Left half of second row
- Size: 400px × 320px
- Chart type: Radar (spider) chart — 4 axes: Backend, Frontend, DevOps, Systems
- Library: Recharts `RadarChart` component
- Color fill: `rgba(247, 147, 26, 0.3)` (Bitcoin orange transparent)
- Stroke: `#F7931A` solid 2px
- Score legend below chart: four inline labels with score values (e.g. Backend: 72 | Frontend: 68 | DevOps: 85 | Systems: 44)
- On hover of each axis point: tooltip with "Top X% of PoWR developers in this domain"

**Component: Recent Verified Work Feed**
- Position: Right half of second row
- Size: flex-1, min-height 320px
- Header: "Recent Verified Work" + external link icon
- Each item: repo name (bold), timestamp (muted), external link icon
- Items sorted by: most recent first
- Max visible: 6 items with "View all" link
- Empty state: "No verified work yet. Connect your GitHub to get started."
- Each item links to the GitHub repo in a new tab

**Component: On-Chain Proofs Section**
- Position: Full width, third row
- Header: "On-Chain Proofs [count badge]" + edit/settings icon
- Sub-header (conditional): Orange "Unpublished Updates" banner with "Publish Now" button
  - Banner background: `#FFF4E6`, border-left: 4px solid `#F7931A`
  - "Publish Now" button: solid `#F7931A`, white text, rounded-lg
  - Sub-text: "Analysis from [date]"
- Contract address row: PoWRRegistry Contract label + contract address (truncated) + copy icon + explorer link icon
- Snapshot list (most recent first): Each snapshot card shows:
  - Snapshot number (#8, #7, etc.)
  - Status badge: "Recorded" (green) or "Pending" (yellow)
  - Date + time
  - Block number + "View TX" link (links to `explorer.hiro.so/txid/[txid]`)
  - Skill score pills: colored badges showing score values for each domain

**Component: Right Panel — Recent Activity**
- Width: 280px, fixed right sidebar
- Section: "Recent Activity" (header) + "Contract" label (muted, right-aligned)
- Each activity item:
  - Status dot (yellow = pending, green = published)
  - "Unpublished" or "Proof Published" label
  - Timestamp (relative, e.g. "7h ago")
  - Status badge: "Pending" or "On-Chain"
  - If published: transaction hash (truncated, with copy icon)
- "+N more proofs" expand link

**Component: Right Panel — Subscription**
- Plan: current plan name (right-aligned, bold)
- Next Update: date (right-aligned)
- "Manage Subscription" button: full-width, outlined, links to Stripe Customer Portal

**Component: Right Panel — Suggested Jobs & Gigs**
- Section header: "Suggested Jobs & Gigs" with briefcase icon
- Each job card:
  - Company name
  - Job title (bold)
  - Truncated description (2 lines max)
  - Salary range
  - Skill tags (colored pills: Backend, DevOps, Node.js, etc.)
  - Bookmark icon (top-right of card)
- Max 3 suggestions, "View all" link below

#### 4.1.4 On-Chain Proofs Page (`/dashboard/proofs`)

Full-page view of all on-chain submissions.

```
┌─────────────────────────────────────────────────────────────────┐
│ On-Chain Proofs                          [+ Publish New Proof]  │
├─────────────────────────────────────────────────────────────────┤
│ Contract: SP1XYZ...powr-registry    [Copy] [View on Explorer]   │
│ Network: Stacks Mainnet                                         │
├─────────────────────────────────────────────────────────────────┤
│ FILTER: [All ▼] [Date range] [Status: All ▼]    [Search txid]  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Snapshot #8                                    [Recorded ●] │ │
│ │ Mar 15, 2026 08:46 AM                                       │ │
│ │ Block: #58806243    TX: 0x8fb4...76988    [View TX ↗]       │ │
│ │ Scores: Backend 72 | Frontend 68 | DevOps 85 | Systems 44  │ │
│ │ Repos analyzed: 9 | PRs merged: 3 | Commits: 147           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Snapshot #7                                  [Unpublished ○]│ │
│ │ Mar 1, 2026 10:20 AM                                        │ │
│ │ Scores: Backend 68 | Frontend 65 | DevOps 80 | Systems 40  │ │
│ │                                          [Publish This ↑]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Publish Proof Modal:**

When user clicks "Publish New Proof" or "Publish This":
```
┌─────────────────────────────────────────────────────────┐
│  Publish Work Proof On-Chain                        [×]  │
├─────────────────────────────────────────────────────────┤
│  You are about to anchor this snapshot to the Stacks    │
│  blockchain. This action is permanent and costs a small  │
│  STX transaction fee (~0.01 STX).                        │
│                                                          │
│  Snapshot:     #8 — Mar 15, 2026                        │
│  Trust Score:  82 → (was 76)                            │
│  Snapshot Hash: 0xabc123...def456                       │
│  Network:       Stacks Mainnet                          │
│                                                          │
│  [Cancel]                    [Confirm & Sign in Wallet] │
└─────────────────────────────────────────────────────────┘
```

After signing: show transaction hash + "View on Hiro Explorer" link. Poll every 10 seconds for `tx_status === 'success'`. On success, show green confirmation banner.

#### 4.1.5 Badges Page (`/dashboard/badges`)

```
┌─────────────────────────────────────────────────────────────────┐
│ My Badges                                                        │
│ Earned badges are soulbound NFTs on the Stacks blockchain.      │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │   [icon]     │ │   [icon]     │ │   [icon]     │            │
│ │  Sustained   │ │  DevOps      │ │  Shipped     │            │
│ │ Contributor  │ │  Engineer    │ │              │            │
│ │   SILVER     │ │  BRONZE      │ │   BRONZE     │            │
│ │ Earned Mar 1 │ │ Earned Feb 8 │ │ Earned Jan 2 │            │
│ │ [View on     │ │ [View on     │ │ [View on     │            │
│ │  Explorer]   │ │  Explorer]   │ │  Explorer]   │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ Locked Badges                                                   │
│ ┌──────────────┐ ┌──────────────┐                              │
│ │   [locked]   │ │   [locked]   │                              │
│ │  OSS Merger  │ │   Security   │                              │
│ │   BRONZE     │ │   BRONZE     │                              │
│ │ Need: 1 PR   │ │ Need: audit  │                              │
│ │ to 100+ star │ │ evidence     │                              │
│ │ repo         │ │              │                              │
│ └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

Badge tiers have distinct visual treatments:
- **Bronze:** `#CD7F32` border, metallic bronze icon tint
- **Silver:** `#C0C0C0` border, silver icon tint
- **Gold:** `#FFD700` border, gold icon tint, subtle glow

#### 4.1.6 Settings Page (`/dashboard/settings`)

Sections:
1. **Profile** — Display name, public profile URL slug, bio (160 chars max), location
2. **Connected Accounts** — GitHub (show username + disconnect), Stacks wallet (show address, cannot disconnect without re-auth)
3. **BNS Name** — Resolve user's `.btc` name from BNS; display as primary identity if set. Link to btc.us to register one.
4. **Notifications** — Toggle: email on new badge earned, email on weekly score update, email on job match
5. **Privacy** — Toggle: public profile visible, include in recruiter search, show exact commit counts
6. **Danger Zone** — Delete account (red, confirmation required)

---

### 4.2 Admin Dashboard

Accessible only to users with `role: 'admin'` in Supabase. Route: `/admin`. Separate layout from developer dashboard — full-width, light mode default.

#### 4.2.1 Admin Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN TOPBAR                                                        │
│  PoWR Admin Console              [Environment: Production]  [Logout]│
├──────────────┬──────────────────────────────────────────────────────┤
│  ADMIN NAV   │  MAIN CONTENT                                         │
│  (220px)     │                                                       │
│              │                                                       │
│  Overview    │  [Active admin view renders here]                     │
│  Users       │                                                       │
│  Revenue     │                                                       │
│  Subscript.  │                                                       │
│  Badges      │                                                       │
│  Fraud Queue │                                                       │
│  Contracts   │                                                       │
│  Settings    │                                                       │
└──────────────┴──────────────────────────────────────────────────────┘
```

#### 4.2.2 Overview Page (`/admin`)

**KPI Cards Row (top):**

| Card | Metric | Calculation |
|---|---|---|
| Total Users | COUNT(users) | All registered users |
| Active Subscribers | COUNT(subscriptions WHERE status='active') | Paying users only |
| Monthly Recurring Revenue | SUM(amount_usd_cents)/100 WHERE event_type='payment_succeeded' AND month=current | USD |
| Churn This Month | COUNT WHERE event_type='subscription_cancelled' AND month=current | Count |
| Proofs Published | COUNT(snapshots WHERE published_to_chain=true) | All-time |
| Badges Minted | COUNT(badges WHERE active=true) | All-time |

Each KPI card: white background, metric in large bold type, label below, trend indicator (↑ / ↓) with percentage vs previous month.

**Revenue Chart:**

Line chart — trailing 12 months MRR. X-axis: month labels. Y-axis: USD. Two lines: Total MRR (solid blue) and New MRR (dashed green). Rendered with Recharts `LineChart`.

**Subscriber Breakdown:**

Donut chart — Free vs Basic vs Pro users. Center label: "Total Users: [N]". Legend below.

**Recent Signups Table:**

Columns: User (avatar + handle), Plan, Joined, GitHub Connected, Trust Score, Actions (View / Impersonate). Paginated: 10 rows per page.

#### 4.2.3 Revenue Page (`/admin/revenue`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Revenue Analytics                          [Export CSV ↓]       │
├──────────────────────────────┬──────────────────────────────────┤
│ MRR: $2,847                  │ ARR: $34,164                     │
│ ▲ 12% vs last month          │ ▲ 8% vs last year                │
├──────────────────────────────┴──────────────────────────────────┤
│ [Revenue Chart — 12 months bar chart]                           │
├─────────────────────────────────────────────────────────────────┤
│ Plan Breakdown:                                                  │
│   Basic ($6):   142 subscribers   $852/mo                       │
│   Pro ($15):     38 subscribers   $570/mo                       │
│   Free:         892 users         $0/mo                         │
├─────────────────────────────────────────────────────────────────┤
│ Recent Transactions                                             │
│ [Date] [User] [Plan] [Event] [Amount]                          │
│ Mar 13  sudoevans  Pro  payment_succeeded  $15.00              │
│ Mar 12  alice.btc  Basic  subscription_created  $6.00          │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.4 Users Page (`/admin/users`)

**Filters:** Plan (All / Free / Basic / Pro), GitHub connected (Yes/No), Trust score range slider, Date joined range, Search by handle or STX address.

**User Table Columns:**

| Column | Type | Notes |
|---|---|---|
| User | avatar + handle + stx_address (truncated) | — |
| Plan | badge | Free / Basic / Pro |
| Trust Score | progress bar + number | Color-coded |
| GitHub | chip | Connected / Not connected |
| Joined | date | Relative |
| Last Analysis | date | Relative |
| Badges | count | Clickable to expand |
| Actions | button group | View Profile, Manage Plan, Flag |

**User Detail Panel (right slide-over):**

Opens when clicking a user row. Shows: all snapshot history, badge list with NFT token IDs, STX address with explorer link, Stripe customer link, last 5 on-chain transactions, flag/unflag controls.

#### 4.2.5 Fraud Queue (`/admin/fraud`)

Developers whose profiles have been flagged by automated heuristics:

**Fraud Detection Heuristics (automated flags):**
- Trust score > 80 with 0 merged PRs to external repos
- More than 40 repos created in the last 30 days
- All repos created on the same day with identical commit patterns
- Score increased by more than 30 points between snapshots without corresponding GitHub activity

**Fraud Queue Table:**

| Column | Description |
|---|---|
| User | Handle + trust score |
| Flag Reason | Human-readable reason from heuristic |
| Flagged At | Timestamp |
| Profile Age | Days since signup |
| Actions | Review / Clear Flag / Suspend |

**Review Action:** Opens user detail panel. Admin can: Clear flag (no action), Revoke badges (calls oracle to burn NFTs), Suspend account (sets users.suspended = true).

#### 4.2.6 Contracts Page (`/admin/contracts`)

Live view of deployed Clarity contracts.

```
┌─────────────────────────────────────────────────────────────────┐
│ Deployed Contracts                    Network: Stacks Mainnet   │
├─────────────────────────────────────────────────────────────────┤
│ powr-registry.clar                                              │
│   Address: SP1XYZ...                                            │
│   Deploy Block: 58,200,000                                      │
│   Total Artifacts: 1,247    [Refresh from chain]               │
│   Oracle Principal: SP9ABC...  [Update Oracle]                  │
│   [View on Explorer ↗]                                          │
├─────────────────────────────────────────────────────────────────┤
│ powr-badges.clar                                                │
│   Address: SP1XYZ...                                            │
│   Total Badges Minted: 384                                      │
│   [View on Explorer ↗]                                          │
├─────────────────────────────────────────────────────────────────┤
│ Oracle Wallet                                                   │
│   Address: SP9ABC...                                            │
│   STX Balance: 847.32 STX   [⚠ Below 100 STX threshold]        │
│   [Fund Oracle Wallet]                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Recruiter / Hiring Portal

Route: `/hire`. Separate navigation from developer dashboard. Light mode. Requires recruiter account (separate registration flow from developer).

> **v1 Note:** Recruiter search and portal are defined here for design completeness. The talent search feature is scheduled for v1.5. The recruiter-facing job posting feature is v1. Recruiters can post jobs in v1; search is v1.5.

#### 4.3.1 Recruiter Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  NAV: [PoWR for Teams logo]   Dashboard  Talent  Jobs  Billing      │
│                                                    [Post a Job]     │
├─────────────────────────────────────────────────────────────────────┤
│  [Active recruiter view]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Recruiter Dashboard (`/hire/dashboard`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Welcome back, Amara                                             │
├────────────────┬────────────────┬───────────────┬──────────────┤
│ Active Jobs    │ Applications   │ Saved Profiles│ Avg Trust    │
│      3         │      47        │      12       │    Score: 74 │
└────────────────┴────────────────┴───────────────┴──────────────┘

Active Job Postings:
┌─────────────────────────────────────────────────────────────────┐
│ Senior DevOps Engineer          [12 applicants]  [Active ●]    │
│ Tags: Kubernetes · Terraform · AWS             [View] [Edit]   │
├─────────────────────────────────────────────────────────────────┤
│ Backend Engineer (Node.js)      [28 applicants]  [Active ●]    │
│ Tags: Node.js · PostgreSQL · API               [View] [Edit]   │
├─────────────────────────────────────────────────────────────────┤
│ Clarity Smart Contract Dev       [7 applicants]  [Active ●]    │
│ Tags: Clarity · Stacks · DeFi                  [View] [Edit]   │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.3 Talent Search (`/hire/talent`) — v1.5

**Search Interface:**

```
┌─────────────────────────────────────────────────────────────────┐
│ FILTERS (left panel, 280px)    │  RESULTS (flex-1)              │
│                                │                                │
│ Primary Domain:                │  47 verified developers found  │
│  ○ Backend                     │                                │
│  ● DevOps                      │  ┌────────────────────────┐   │
│  ○ Frontend                    │  │ 🔐 devs.btc            │   │
│  ○ Systems                     │  │ Trust Score: 87  [●●●●○]│   │
│  ○ Smart Contracts             │  │ DevOps: 91              │   │
│                                │  │ Badges: DevOps Gold     │   │
│ Min Trust Score: [──●──] 70    │  │         Sustained Silver│   │
│                                │  │ Tools: k8s · TF · AWS  │   │
│ Required Tools:                │  │ Availability: Open     │   │
│  [+ Add tool]                  │  │ [View Profile] [Save]  │   │
│  [x] Kubernetes                │  └────────────────────────┘   │
│  [x] Terraform                 │                                │
│                                │  ┌────────────────────────┐   │
│ Min Merged PRs:                │  │ alice.btc              │   │
│  [──●──] 5                     │  │ Trust Score: 79  [●●●○○]│   │
│                                │  │ DevOps: 84              │   │
│ Activity:                      │  │ Badges: DevOps Bronze   │   │
│  □ Active last 30 days         │  │ Tools: Docker · GHA    │   │
│  □ Has published packages      │  │ Availability: Open     │   │
│  □ Has merged OSS PRs          │  │ [View Profile] [Save]  │   │
│                                │  └────────────────────────┘   │
│ Availability:                  │                                │
│  □ Open to work                │  [Load more results]          │
│                                │                                │
│ [Clear All]  [Apply Filters]   │                                │
└────────────────────────────────┴────────────────────────────────┘
```

**How Domain Search Works (Technical Implementation):**

Talent search does NOT rely on self-reported skills. The domain score displayed is computed from actual file-change fingerprinting:

- A developer with `devops_score >= 75` appears in DevOps search results
- Tool tags (Kubernetes, Terraform) are inferred from file patterns in work_artifacts: `.github/workflows/*.yml` (GitHub Actions), `*.tf` (Terraform), `k8s/**` (Kubernetes)
- These tags are stored as `domain_tags TEXT[]` in work_artifacts and indexed for fast querying
- Minimum trust score filter maps directly to `trust_score >= N` in the snapshots table
- All filter queries join on the most recent published snapshot per user

#### 4.3.4 Post a Job (`/hire/jobs/new`) — v1

```
┌─────────────────────────────────────────────────────────────────┐
│ Post a Job Opening                                              │
├─────────────────────────────────────────────────────────────────┤
│ Job Title *                                                     │
│ [Senior DevOps Engineer                                       ] │
│                                                                 │
│ Company *                                                       │
│ [TechCorp                                                     ] │
│                                                                 │
│ Job Type *    [Full-time ▼]                                     │
│                                                                 │
│ Location      [Remote ▼]                                        │
│                                                                 │
│ Salary Range  [$ 120,000] to [$ 180,000]   Currency [USD ▼]   │
│                                                                 │
│ Required Domain *  [DevOps ▼]                                   │
│                                                                 │
│ Required Tools (comma-separated)                                │
│ [Kubernetes, Terraform, AWS, Linux                            ] │
│                                                                 │
│ Minimum Trust Score Required  [──●──] 60                       │
│                                                                 │
│ Description *                                                   │
│ [                                                             ] │
│ [                                                             ] │
│ [                                      ] (500 chars max)       │
│                                                                 │
│ [Save Draft]                    [Post Job — $29/30 days]       │
└─────────────────────────────────────────────────────────────────┘
```

**Job Posting Data Model:**

```sql
CREATE TABLE job_postings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id     UUID NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  company          TEXT NOT NULL,
  job_type         TEXT CHECK (job_type IN ('full-time','part-time','contract','gig')),
  location_type    TEXT CHECK (location_type IN ('remote','hybrid','onsite')),
  salary_min_usd   INT,
  salary_max_usd   INT,
  required_domain  TEXT CHECK (required_domain IN ('backend','frontend','devops','systems','contracts')),
  required_tools   TEXT[],
  min_trust_score  SMALLINT DEFAULT 0,
  description      TEXT NOT NULL,
  status           TEXT DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  expires_at       TIMESTAMPTZ,
  stripe_payment_id TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.3.5 Candidate Profile View (Recruiter's View)

When a recruiter clicks "View Profile" on a developer:

```
┌─────────────────────────────────────────────────────────────────┐
│ devs.btc                                      [Save] [Contact] │
│ SP1XYZ...ABC  ·  sudoevans  ·  github.com/sudoevans            │
│ Trust Score: 87                                                 │
├────────────────────────────────┬────────────────────────────────┤
│ SKILL RADAR CHART              │  TOP DOMAIN: DevOps (91)      │
│ [radar chart — same as dev     │  Repos Analyzed: 9            │
│  dashboard but read-only]      │  PRs Merged: 23               │
│                                │  Sustained Activity: 18 mo    │
├────────────────────────────────┴────────────────────────────────┤
│ Verified Badges                                                 │
│ [DevOps Gold NFT]  [Sustained Contributor Silver]  [Shipped]   │
│ Each badge links to on-chain proof on explorer.hiro.so          │
├─────────────────────────────────────────────────────────────────┤
│ On-Chain Work Proofs                                            │
│ Last published: Mar 15, 2026  ·  Block #58806243               │
│ TX: 0x8fb4...  [Verify on Hiro Explorer ↗]                     │
│                                                                 │
│ Recent Verified Repos:                                          │
│  • keep-alive — 12 hours ago                                    │
│  • sudoevans — 2 weeks ago                                      │
│  • n8n-nodes-mpesa-daraja — Feb 10, 2026                       │
├─────────────────────────────────────────────────────────────────┤
│ ⚠ Note: Scores shown are as of the last published on-chain      │
│ snapshot. All data is verifiable at explorer.hiro.so.           │
└─────────────────────────────────────────────────────────────────┘
```

**Privacy Controls:** Developers can opt out of recruiter search in Settings. Opted-out profiles do not appear in `/hire/talent` search results but their public profile page remains accessible if the URL is shared directly.

---

### 4.4 Public Developer Profile

Route: `/p/[stx-address-or-bns-name]` — accessible without authentication.  
Example: `powr.app/p/sudoevans.btc` or `powr.app/p/SP1XYZ...`

```
┌─────────────────────────────────────────────────────────────────┐
│  [PoWR logo]                          [I'm hiring — Post a Job] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  sudoevans.btc                                                  │
│  SP1XYZ...ABC                                                   │
│  github.com/sudoevans                                           │
│                                                                  │
│  [Trust Score: 87]  [DevOps: 91]  [Backend: 72]                │
│                                                                  │
│  ──────────────────────────────────────────────────────────     │
│  Badges                                                          │
│  [DevOps Gold]  [Sustained Contributor Silver]  [Shipped Bronze]│
│  Each badge → link to NFT on explorer.hiro.so                   │
│  ──────────────────────────────────────────────────────────     │
│  Skill Radar Chart [read-only]                                   │
│  ──────────────────────────────────────────────────────────     │
│  Verified Work Contributions                                     │
│  keep-alive · sudoevans · n8n-nodes-mpesa-daraja · riko · jinsu │
│  ──────────────────────────────────────────────────────────     │
│  On-Chain Proof                                                  │
│  Last verified: Mar 15, 2026 at block #58806243                 │
│  Transaction: 0x8fb4ff2123e9a11fc827c4945...  [Verify ↗]       │
│                                                                  │
│  ⚡ Powered by Stacks · Secured by Bitcoin                       │
└─────────────────────────────────────────────────────────────────┘
```

**SEO:** Public profile pages are server-side rendered (Next.js `generateMetadata`) with structured metadata for `og:title`, `og:description`, and `twitter:card`. Title format: `[name] — Verified Developer on PoWR | Trust Score [N]`.

---

### 4.5 Onboarding Flow

New user onboarding: 4 steps, linear, cannot skip.

**Step 1 — Connect Wallet**
```
┌─────────────────────────────────────────────────────────────────┐
│            Welcome to PoWR                    Step 1 of 4       │
│   Your proof-of-work reputation on Bitcoin                      │
│                                                                  │
│   Connect your Stacks wallet to get started.                    │
│   Your STX address becomes your PoWR identity.                  │
│                                                                  │
│   [Connect with Leather  🪙]                                    │
│   [Connect with Xverse   🟠]                                    │
│                                                                  │
│   Don't have a wallet? → leather.io  |  xverse.app             │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2 — Connect GitHub**
```
┌─────────────────────────────────────────────────────────────────┐
│  Connect GitHub                               Step 2 of 4       │
│                                                                  │
│  PoWR needs read-only access to your public repositories.       │
│  We analyze: commits, pull requests, repo metadata.             │
│  We NEVER read: private repos, code content, secrets.           │
│                                                                  │
│   OAuth scope requested: public_repo, read:user                 │
│                                                                  │
│   [Connect GitHub  ⬡]                                          │
│                                                                  │
│   [← Back]                                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3 — Initial Analysis (async)**
```
┌─────────────────────────────────────────────────────────────────┐
│  Analyzing your contributions                 Step 3 of 4       │
│                                                                  │
│  [████████████░░░░░░░░░░░░░░░] 47%                             │
│                                                                  │
│  Scanning 9 repositories...                                     │
│  ✓ Analyzed 147 commits                                         │
│  ✓ Found 23 merged pull requests                               │
│  ⏳ Computing domain scores...                                   │
│                                                                  │
│  This takes 30–60 seconds. We only do a full scan once.         │
│  Future updates are incremental (delta only).                   │
└─────────────────────────────────────────────────────────────────┘
```

**Step 4 — Choose Plan**
```
┌─────────────────────────────────────────────────────────────────┐
│  Choose your plan                             Step 4 of 4       │
├───────────────┬──────────────────┬────────────────────────────┤
│   FREE        │   BASIC  $6/mo   │   PRO      $15/mo          │
│               │   ★ Popular      │                            │
│  Every 14     │  Every Monday    │  Real-time webhooks        │
│  days         │                  │                            │
│  Basic profile│  All Free +      │  All Basic +               │
│  On-chain     │  Weekly updates  │  Real-time updates         │
│  proofs       │  Priority support│  Advanced analytics        │
│  Public page  │                  │  API access                │
│               │                  │  Auto-publish threshold    │
│  [Continue]   │  [Start Basic]   │  [Start Pro]               │
└───────────────┴──────────────────┴────────────────────────────┘
```

After plan selection: Free → go to dashboard. Paid → Stripe Checkout → return to dashboard with success banner.

---

## 5. Database Schema

All tables: UUID primary keys, `timestamptz` for time fields, Row-Level Security enabled.

### 5.1 users

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stx_address         TEXT UNIQUE NOT NULL,
  bns_name            TEXT,                    -- e.g. 'sudoevans.btc', nullable
  github_username     TEXT UNIQUE,
  github_id           BIGINT UNIQUE,
  github_oauth_token  TEXT,                    -- encrypted at rest via Supabase Vault
  email               TEXT,
  display_name        TEXT,
  bio                 TEXT CHECK (char_length(bio) <= 160),
  location            TEXT,
  role                TEXT NOT NULL DEFAULT 'developer'
                      CHECK (role IN ('developer','recruiter','admin')),
  plan                TEXT NOT NULL DEFAULT 'free'
                      CHECK (plan IN ('free','basic','pro')),
  stripe_customer_id  TEXT UNIQUE,
  webhook_registered  BOOLEAN DEFAULT FALSE,
  open_to_work        BOOLEAN DEFAULT TRUE,
  show_in_search      BOOLEAN DEFAULT TRUE,
  suspended           BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  last_analysis       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 subscriptions

```sql
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL CHECK (plan IN ('basic','pro')),
  status                  TEXT NOT NULL
                          CHECK (status IN ('active','cancelled','past_due','trialing')),
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_price_id         TEXT NOT NULL,
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 snapshots

```sql
CREATE TABLE snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trust_score         SMALLINT NOT NULL DEFAULT 0
                      CHECK (trust_score BETWEEN 0 AND 100),
  backend_score       SMALLINT NOT NULL DEFAULT 0
                      CHECK (backend_score BETWEEN 0 AND 100),
  frontend_score      SMALLINT NOT NULL DEFAULT 0
                      CHECK (frontend_score BETWEEN 0 AND 100),
  devops_score        SMALLINT NOT NULL DEFAULT 0
                      CHECK (devops_score BETWEEN 0 AND 100),
  systems_score       SMALLINT NOT NULL DEFAULT 0
                      CHECK (systems_score BETWEEN 0 AND 100),
  contracts_score     SMALLINT NOT NULL DEFAULT 0
                      CHECK (contracts_score BETWEEN 0 AND 100),
  repos_analyzed      SMALLINT NOT NULL DEFAULT 0,
  prs_merged          INT NOT NULL DEFAULT 0,
  total_commits       INT NOT NULL DEFAULT 0,
  snapshot_hash       TEXT NOT NULL,            -- SHA-256 of snapshot JSON
  published_to_chain  BOOLEAN DEFAULT FALSE,
  stacks_tx_id        TEXT,
  block_height        BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 work_artifacts

```sql
CREATE TABLE work_artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_full_name  TEXT NOT NULL,              -- e.g. 'torvalds/linux'
  repo_stars      INT DEFAULT 0,
  commit_sha      TEXT,
  pr_number       INT,
  artifact_type   TEXT NOT NULL
                  CHECK (artifact_type IN
                    ('commit','pr_merged','repo_created','package_published','contract_deployed')),
  domain_tags     TEXT[],                     -- ['devops','backend']
  tool_tags       TEXT[],                     -- ['kubernetes','terraform']
  is_external     BOOLEAN DEFAULT FALSE,      -- true if repo not owned by user
  verified        BOOLEAN DEFAULT FALSE,
  on_chain_id     BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 badges

```sql
CREATE TABLE badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type    TEXT NOT NULL,                -- 'sustained_contributor','oss_merger','shipped',...
  tier          TEXT NOT NULL
                CHECK (tier IN ('bronze','silver','gold')),
  domain        TEXT,                         -- domain this badge applies to (nullable for general badges)
  nft_token_id  BIGINT,                       -- SIP-009 token ID on Stacks
  active        BOOLEAN DEFAULT TRUE,
  minted_at     TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 revenue_events

```sql
CREATE TABLE revenue_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  event_type        TEXT NOT NULL
                    CHECK (event_type IN (
                      'subscription_created','payment_succeeded',
                      'payment_failed','subscription_cancelled',
                      'plan_upgraded','plan_downgraded')),
  plan              TEXT,
  amount_usd_cents  INT NOT NULL DEFAULT 0,
  stripe_event_id   TEXT UNIQUE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.7 job_postings

```sql
CREATE TABLE job_postings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id      UUID NOT NULL REFERENCES users(id),
  title             TEXT NOT NULL,
  company           TEXT NOT NULL,
  job_type          TEXT CHECK (job_type IN ('full-time','part-time','contract','gig')),
  location_type     TEXT CHECK (location_type IN ('remote','hybrid','onsite')),
  salary_min_usd    INT,
  salary_max_usd    INT,
  required_domain   TEXT,
  required_tools    TEXT[],
  min_trust_score   SMALLINT DEFAULT 0,
  description       TEXT NOT NULL,
  status            TEXT DEFAULT 'active'
                    CHECK (status IN ('draft','active','closed')),
  expires_at        TIMESTAMPTZ,
  stripe_payment_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.8 recruiter_saves

```sql
CREATE TABLE recruiter_saves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id  UUID NOT NULL REFERENCES users(id),
  developer_id  UUID NOT NULL REFERENCES users(id),
  job_id        UUID REFERENCES job_postings(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recruiter_id, developer_id)
);
```

### 5.9 Indexes

```sql
CREATE INDEX idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX idx_snapshots_published ON snapshots(published_to_chain, created_at DESC);
CREATE INDEX idx_snapshots_scores ON snapshots(trust_score, devops_score, backend_score);
CREATE INDEX idx_artifacts_user_domain ON work_artifacts(user_id, domain_tags);
CREATE INDEX idx_artifacts_tool_tags ON work_artifacts USING GIN(tool_tags);
CREATE INDEX idx_badges_user_active ON badges(user_id, active);
CREATE INDEX idx_revenue_created_at ON revenue_events(created_at DESC);
CREATE INDEX idx_jobs_domain ON job_postings(required_domain, status);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_search ON users(show_in_search, open_to_work, suspended);
```

### 5.10 Row-Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own rows
CREATE POLICY users_self_select ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_self_update ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY snapshots_owner ON snapshots USING (user_id = auth.uid());
CREATE POLICY artifacts_owner ON work_artifacts USING (user_id = auth.uid());

-- Public profile data: allow SELECT on published snapshots for any authenticated user
CREATE POLICY snapshots_public_read ON snapshots
  FOR SELECT USING (published_to_chain = true);

-- Service role bypasses all RLS — used by API routes only
```

> **Critical:** API routes MUST use `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses RLS and must never be sent to the client. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used client-side only for authenticated user reads.

---

## 6. Smart Contracts — Clarity 2.0

All contracts are written in Clarity 2.0 and deployed to Stacks Mainnet. Contracts are non-upgradeable by design. State migrations require new contract deployment.

> **Development tool:** Clarinet v2.x  
> **Local testing:** `clarinet console` (simnet), `clarinet test` (Vitest)  
> **Deployment:** `clarinet deployments apply --mainnet`

### 6.1 powr-registry.clar

```clarity
;; ============================================================
;; PoWR Registry Contract
;; Stores: work artifacts, trust scores, identity bindings
;; Deploy: Stacks Mainnet
;; ============================================================

;; ---- Constants ----
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED    (err u401))
(define-constant ERR_NOT_FOUND       (err u404))
(define-constant ERR_ALREADY_EXISTS  (err u409))
(define-constant ERR_INVALID_SCORE   (err u422))
(define-constant ERR_SUSPENDED       (err u403))

;; ---- Data Vars ----
(define-data-var oracle-principal principal CONTRACT_OWNER)
(define-data-var artifact-counter uint u0)

;; ---- Data Maps ----

;; User reputation profiles
(define-map profiles
  { user: principal }
  { trust-score:      uint,
    backend:          uint,
    frontend:         uint,
    devops:           uint,
    systems:          uint,
    contracts:        uint,
    last-updated:     uint,     ;; block height
    active:           bool,
    suspended:        bool })

;; GPG fingerprint to wallet binding (write-once)
(define-map gpg-bindings
  { fingerprint: (string-ascii 40) }
  { wallet:      principal,
    bound-at:    uint })

;; Work artifacts — append-only
(define-map work-artifacts
  { artifact-id: uint }
  { owner:         principal,
    commit-sha:    (string-ascii 64),
    repo:          (string-ascii 200),
    snapshot-hash: (string-ascii 64),
    artifact-type: (string-ascii 30),
    domain-tag:    (string-ascii 30),
    block-height:  uint,
    verified:      bool })

;; ---- Oracle Management ----

(define-public (set-oracle-principal (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set oracle-principal new-oracle)
    (ok true)))

;; ---- Public Functions ----

;; User submits a work artifact (self-service, any user)
(define-public (submit-artifact
    (commit-sha    (string-ascii 64))
    (repo          (string-ascii 200))
    (snapshot-hash (string-ascii 64))
    (artifact-type (string-ascii 30))
    (domain-tag    (string-ascii 30)))
  (let ((id (+ (var-get artifact-counter) u1)))
    (match (map-get? profiles { user: tx-sender })
      profile (asserts! (not (get suspended profile)) ERR_SUSPENDED)
      true)    ;; new users can submit before profile is created
    (var-set artifact-counter id)
    (map-set work-artifacts { artifact-id: id }
      { owner:          tx-sender,
        commit-sha:     commit-sha,
        repo:           repo,
        snapshot-hash:  snapshot-hash,
        artifact-type:  artifact-type,
        domain-tag:     domain-tag,
        block-height:   block-height,
        verified:       false })
    (ok id)))

;; Oracle marks artifact as verified after off-chain validation
(define-public (verify-artifact (artifact-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)
    (match (map-get? work-artifacts { artifact-id: artifact-id })
      artifact (begin
        (map-set work-artifacts { artifact-id: artifact-id }
          (merge artifact { verified: true }))
        (ok true))
      ERR_NOT_FOUND)))

;; Oracle updates trust scores after analysis
(define-public (update-scores
    (user       principal)
    (trust      uint)
    (backend    uint)
    (frontend   uint)
    (devops     uint)
    (systems    uint)
    (contracts  uint))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)
    (asserts! (and (<= trust u100) (<= backend u100)
                   (<= frontend u100) (<= devops u100)
                   (<= systems u100) (<= contracts u100)) ERR_INVALID_SCORE)
    (map-set profiles { user: user }
      { trust-score:  trust,
        backend:      backend,
        frontend:     frontend,
        devops:       devops,
        systems:      systems,
        contracts:    contracts,
        last-updated: block-height,
        active:       true,
        suspended:    false })
    (ok true)))

;; Oracle suspends a user (fraud detection)
(define-public (suspend-user (user principal))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)
    (match (map-get? profiles { user: user })
      profile (begin
        (map-set profiles { user: user }
          (merge profile { suspended: true }))
        (ok true))
      ERR_NOT_FOUND)))

;; Bind GPG fingerprint to caller's wallet — write-once
(define-public (bind-gpg-key (fingerprint (string-ascii 40)))
  (begin
    (asserts! (is-none (map-get? gpg-bindings { fingerprint: fingerprint }))
              ERR_ALREADY_EXISTS)
    (map-set gpg-bindings { fingerprint: fingerprint }
      { wallet: tx-sender, bound-at: block-height })
    (ok true)))

;; ---- Read-Only Functions ----

(define-read-only (get-profile (user principal))
  (map-get? profiles { user: user }))

(define-read-only (get-artifact (artifact-id uint))
  (map-get? work-artifacts { artifact-id: artifact-id }))

(define-read-only (get-artifact-count)
  (var-get artifact-counter))

(define-read-only (get-gpg-binding (fingerprint (string-ascii 40)))
  (map-get? gpg-bindings { fingerprint: fingerprint }))

(define-read-only (get-oracle)
  (var-get oracle-principal))
```

### 6.2 powr-badges.clar

```clarity
;; ============================================================
;; PoWR Badges Contract — SIP-009 Soulbound NFT
;; Badges are non-transferable. Transfer always returns ERR.
;; ============================================================

(impl-trait 'SP2PABAF9FTAJYNFZIFU8V83XQLP3RDSP2PKR4TRV.nft-trait.nft-trait)

(define-non-fungible-token powr-badge uint)

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_SOULBOUND    (err u403))
(define-constant ERR_NOT_FOUND    (err u404))

(define-data-var badge-counter uint u0)
(define-data-var oracle-principal principal CONTRACT_OWNER)

(define-map badge-data
  { token-id: uint }
  { badge-type:  (string-ascii 50),
    tier:        (string-ascii 10),    ;; 'bronze' | 'silver' | 'gold'
    domain:      (string-ascii 30),
    earned-at:   uint,                 ;; block height
    owner:       principal,
    active:      bool })

;; ---- SIP-009 Required Functions ----

;; Transfer is ALWAYS rejected — soulbound
(define-public (transfer (id uint) (sender principal) (recipient principal))
  ERR_SOULBOUND)

(define-read-only (get-last-token-id)
  (ok (var-get badge-counter)))

(define-read-only (get-token-uri (id uint))
  (ok (some (concat "https://powr.app/api/badge-metadata/" (uint-to-ascii id)))))

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? powr-badge id)))

;; ---- Badge Management ----

(define-public (set-oracle-principal (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set oracle-principal new-oracle)
    (ok true)))

(define-public (mint-badge
    (recipient  principal)
    (badge-type (string-ascii 50))
    (tier       (string-ascii 10))
    (domain     (string-ascii 30)))
  (let ((id (+ (var-get badge-counter) u1)))
    (asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)
    (try! (nft-mint? powr-badge id recipient))
    (var-set badge-counter id)
    (map-set badge-data { token-id: id }
      { badge-type: badge-type,
        tier:       tier,
        domain:     domain,
        earned-at:  block-height,
        owner:      recipient,
        active:     true })
    (ok id)))

;; Oracle revokes a badge (fraud or inactivity)
(define-public (revoke-badge (token-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)
    (match (map-get? badge-data { token-id: token-id })
      data (begin
        (try! (nft-burn? powr-badge token-id (get owner data)))
        (map-set badge-data { token-id: token-id }
          (merge data { active: false }))
        (ok true))
      ERR_NOT_FOUND)))

;; ---- Read-Only ----

(define-read-only (get-badge (token-id uint))
  (map-get? badge-data { token-id: token-id }))
```

### 6.3 Contract Deployment Sequence

```bash
# 1. Create Clarinet project
clarinet new powr-stacks
cd powr-stacks

# 2. Add contracts
# Copy powr-registry.clar and powr-badges.clar into contracts/

# 3. Run tests locally (simnet)
clarinet test --coverage

# 4. Deploy to testnet
clarinet deployments apply --testnet

# 5. Record contract addresses from output
# CONTRACT_ADDRESS=SP<deployer-address>

# 6. Call set-oracle-principal after deployment
# Use Leather wallet or clarinet console:
# (contract-call? .powr-registry set-oracle-principal 'SP<oracle-address>)

# 7. Deploy to mainnet
clarinet deployments apply --mainnet
```

---

## 7. Hiro Platform Integration

### 7.1 Hiro Stacks Blockchain API

**Base URL:** `https://api.hiro.so`  
**Authentication:** `x-api-key: <HIRO_API_KEY>` header on all requests  
**SDK:** `@hirosystems/stacks-api-client`

#### Installation

```bash
npm install @hirosystems/stacks-api-client @stacks/transactions @stacks/connect @stacks/network
```

#### Client Configuration

```typescript
// lib/hiro.ts
import { Configuration, SmartContractsApi, TransactionsApi, AccountsApi }
  from '@hirosystems/stacks-api-client';

const hiroConfig = new Configuration({
  basePath: 'https://api.hiro.so',
  apiKey: process.env.HIRO_API_KEY,   // server-side only
});

export const contractsApi = new SmartContractsApi(hiroConfig);
export const txApi        = new TransactionsApi(hiroConfig);
export const accountsApi  = new AccountsApi(hiroConfig);
```

#### Reading Trust Score from Chain

```typescript
// lib/chain.ts
import { cvToJSON, principalCV, cvToHex } from '@stacks/transactions';
import { contractsApi } from './hiro';

export async function getOnChainProfile(stxAddress: string) {
  const result = await contractsApi.callReadOnlyFunction({
    contractAddress: process.env.POWR_CONTRACT_ADDRESS!,
    contractName: 'powr-registry',
    functionName: 'get-profile',
    readOnlyFunctionArgs: {
      sender: stxAddress,
      arguments: [`0x${cvToHex(principalCV(stxAddress))}`],
    },
  });
  if (!result.result) return null;
  return cvToJSON(result.result);
}
```

#### Polling Transaction Status

```typescript
export async function pollTransaction(txId: string, maxAttempts = 20): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const tx = await txApi.getTransactionById({ txId });
    if (tx.tx_status === 'success') return true;
    if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') {
      throw new Error(`Transaction failed: ${tx.tx_status}`);
    }
    await new Promise(r => setTimeout(r, 10_000)); // poll every 10s
  }
  return false;
}
```

#### BNS Name Resolution

```typescript
export async function resolveBnsName(address: string): Promise<string | null> {
  const res = await fetch(
    `https://api.hiro.so/v1/addresses/stacks/${address}`,
    { headers: { 'x-api-key': process.env.HIRO_API_KEY! } }
  );
  const data = await res.json();
  return data.names?.[0] ?? null;  // returns 'sudoevans.btc' or null
}
```

### 7.2 Chainhook Configuration

**Chainhook** replaces all polling for on-chain events. Register hooks via the Hiro Platform UI at `platform.hiro.so` or via the Chainhook REST API.

#### Hook 1 — Artifact Submitted

```json
{
  "uuid": "powr-artifact-submitted-v1",
  "name": "PoWR artifact submission watcher",
  "version": 1,
  "chain": "stacks",
  "networks": {
    "mainnet": {
      "start_block": "<DEPLOY_BLOCK_HEIGHT>",
      "predicate": {
        "scope": "contract_call",
        "contract_identifier": "<CONTRACT_ADDRESS>.powr-registry",
        "method": "submit-artifact"
      },
      "then_that": {
        "http_post": {
          "url": "https://powr.app/api/chainhook/artifact",
          "authorization_header": "Bearer <CHAINHOOK_SECRET>"
        }
      }
    }
  }
}
```

#### Hook 2 — Badge Minted

```json
{
  "uuid": "powr-badge-minted-v1",
  "name": "PoWR badge mint watcher",
  "version": 1,
  "chain": "stacks",
  "networks": {
    "mainnet": {
      "start_block": "<DEPLOY_BLOCK_HEIGHT>",
      "predicate": {
        "scope": "contract_call",
        "contract_identifier": "<CONTRACT_ADDRESS>.powr-badges",
        "method": "mint-badge"
      },
      "then_that": {
        "http_post": {
          "url": "https://powr.app/api/chainhook/badge",
          "authorization_header": "Bearer <CHAINHOOK_SECRET>"
        }
      }
    }
  }
}
```

#### Chainhook Receiver — Artifact

```typescript
// app/api/chainhook/artifact/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CHAINHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const block = payload.apply[0];
  const blockHeight = block.block_identifier.index;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const tx of block.transactions) {
    const senderAddress = tx.transaction.sender_address;
    const txId = tx.transaction.txid;

    // Find user by STX address
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stx_address', senderAddress)
      .single();

    if (!user) continue;

    // Mark most recent unpublished snapshot as published
    await supabase
      .from('snapshots')
      .update({
        published_to_chain: true,
        stacks_tx_id: txId,
        block_height: blockHeight,
      })
      .eq('user_id', user.id)
      .eq('published_to_chain', false)
      .order('created_at', { ascending: false })
      .limit(1);
  }

  return new Response('OK', { status: 200 });
}
```

### 7.3 Frontend Wallet Integration

#### Connect Wallet Component

```typescript
// components/ConnectWallet.tsx
'use client';
import { showConnect } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';

export function ConnectWallet() {
  const network = new StacksMainnet();

  const handleConnect = () => showConnect({
    appDetails: { name: 'PoWR', icon: '/logo.png' },
    network,
    onFinish: async ({ userSession }) => {
      const userData = userSession.loadUserData();
      const address = userData.profile.stxAddress.mainnet;
      await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      window.location.href = '/dashboard';
    },
  });

  return (
    <button onClick={handleConnect} className="btn-primary">
      Connect Wallet
    </button>
  );
}
```

#### Submit Artifact Transaction

```typescript
// lib/transactions.ts
import { openContractCall } from '@stacks/connect';
import { stringAsciiCV } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

export async function publishProof(params: {
  commitSha: string;
  repo: string;
  snapshotHash: string;
  artifactType: string;
  domainTag: string;
  onTxId: (txId: string) => void;
}) {
  await openContractCall({
    network: new StacksMainnet(),
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    contractName: 'powr-registry',
    functionName: 'submit-artifact',
    functionArgs: [
      stringAsciiCV(params.commitSha),
      stringAsciiCV(params.repo),
      stringAsciiCV(params.snapshotHash),
      stringAsciiCV(params.artifactType),
      stringAsciiCV(params.domainTag),
    ],
    postConditions: [],
    onFinish: (result) => {
      params.onTxId(result.txId);
    },
    onCancel: () => {
      throw new Error('Transaction cancelled by user');
    },
  });
}
```

---

## 8. Contribution Analysis Engine

### 8.1 Analysis Trigger Matrix

| Plan | Mechanism | Schedule | Implementation |
|---|---|---|---|
| Free | Vercel Cron | Every 14 days at 03:00 UTC | `vercel.json` cron config → `/api/cron/analyze-free` |
| Basic | Vercel Cron | Every Monday at 06:00 UTC | `vercel.json` cron config → `/api/cron/analyze-basic` |
| Pro | GitHub Webhook | On push, pull_request, create events | GitHub App webhook → `/api/webhooks/github` |
| Any | Manual trigger | User clicks "Refresh Analysis" | POST `/api/analysis/trigger` |

#### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/analyze-free",
      "schedule": "0 3 1,15 * *"
    },
    {
      "path": "/api/cron/analyze-basic",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

#### GitHub Webhook Registration (Pro)

On user upgrade to Pro, register webhooks on all their public repos:

```typescript
// lib/github-webhooks.ts
export async function registerWebhooks(githubToken: string, username: string) {
  const repos = await fetchPublicRepos(githubToken, username);

  for (const repo of repos) {
    await fetch(`https://api.github.com/repos/${repo.full_name}/hooks`, {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'create'],
        config: {
          url: 'https://powr.app/api/webhooks/github',
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
      }),
    });
  }
}
```

### 8.2 Delta Analysis Algorithm

```typescript
// lib/analysis/delta.ts
export async function runDeltaAnalysis(userId: string) {
  const user = await getUser(userId);
  const lastSnapshot = await getLatestSnapshot(userId);
  const since = lastSnapshot?.created_at ?? new Date(0).toISOString();

  // Fetch only new data since last snapshot
  const [commits, prs, repos] = await Promise.all([
    fetchCommitsSince(user.github_oauth_token, user.github_username, since),
    fetchMergedPrsSince(user.github_oauth_token, user.github_username, since),
    fetchPublicRepos(user.github_oauth_token, user.github_username),
  ]);

  // Classify each commit/PR by domain
  const artifacts = classifyArtifacts([...commits, ...prs]);

  // Upsert work_artifacts
  await upsertArtifacts(userId, artifacts);

  // Recompute scores from ALL artifacts (not just delta)
  const allArtifacts = await getAllArtifacts(userId);
  const scores = computeScores(allArtifacts, repos);

  // Compute snapshot hash
  const snapshotData = { scores, repos_analyzed: repos.length, ...stats };
  const snapshotHash = sha256(JSON.stringify(snapshotData));

  // Write snapshot
  const snapshot = await createSnapshot(userId, { ...scores, snapshotHash });

  // Evaluate badges
  await evaluateBadges(userId, allArtifacts, scores);

  return snapshot;
}
```

### 8.3 Domain Classification Rules

```typescript
// lib/analysis/classifier.ts
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  devops: [
    /^\.github\/workflows\//,
    /Dockerfile$/,
    /docker-compose\.(yml|yaml)$/,
    /\.tf$/,
    /\.hcl$/,
    /^k8s\//,
    /^helm\//,
    /\.gitlab-ci\.yml$/,
    /^\.circleci\//,
    /^jenkins/i,
    /^ansible\//,
  ],
  backend: [
    /\.go$/,
    /\.py$/,
    /\.java$/,
    /\.rb$/,
    /\.php$/,
    /\.rs$/,
    /^(api|server|routes|controllers|models|migrations|services)\//,
  ],
  frontend: [
    /\.(tsx|jsx)$/,
    /\.vue$/,
    /\.svelte$/,
    /\.(css|scss|sass|less)$/,
    /^(components|pages|views|public|assets|styles)\//,
  ],
  systems: [
    /\.(c|cpp|h|asm|s)$/,
    /^(kernel|drivers|syscalls)\//,
    /Makefile$/,
    /\.ld$/,
  ],
  contracts: [
    /\.clar$/,
    /\.sol$/,
    /\.vy$/,
    /^(contracts|deployments|scripts)\//,
  ],
};

export function classifyFiles(files: string[]): string[] {
  const domains = new Set<string>();
  for (const file of files) {
    for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
      if (patterns.some(p => p.test(file))) {
        domains.add(domain);
      }
    }
  }
  return Array.from(domains);
}
```

### 8.4 Scoring Algorithm

Trust score is a weighted composite. Each domain score is independent.

| Signal | Weight | Measurement | Anti-Gaming |
|---|---|---|---|
| Merged PRs to external repos | 30% | `prs_merged` where `is_external=true` | Must be to repos not owned by user |
| Sustained commit frequency | 20% | Commits/month consistency over 12 months (std dev penalizes bursts) | Burst to empty repos → near-zero |
| Project completion ratio | 15% | Repos with README + deployment evidence ÷ total repos | Graveyard repos reduce score |
| External contributors | 15% | External PRs merged into user's repos | Proves code is useful to others |
| Published packages/contracts | 10% | npm/crates.io/PyPI/Stacks mainnet deploys | Hard to fake |
| Stars (log-scaled) | 5% | `log(stars + 1)` on repos older than 90 days | Neutralizes one-time viral spikes |
| GPG-signed commits | 5% | Signed commits ÷ total commits | Increases non-repudiation |

**Hard floors:**
- Trust score cannot exceed 25 unless the user has ≥ 3 separate repos and ≥ 90 days of history
- Trust score cannot exceed 60 unless the user has ≥ 1 merged PR to an external repo with ≥ 100 stars
- Domain score can only exceed 50 if ≥ 20 commits are tagged to that domain across ≥ 2 repos

### 8.5 Badge Evaluation

```typescript
// lib/analysis/badges.ts
const BADGE_CRITERIA = {
  sustained_contributor: {
    bronze: (a: ArtifactStats) => a.activeMonths >= 6 && a.activeRepos >= 1,
    silver: (a: ArtifactStats) => a.activeMonths >= 12 && a.activeRepos >= 2,
    gold:   (a: ArtifactStats) => a.activeMonths >= 24 && a.activeRepos >= 5
                                   && a.weeklyCommitStreak >= 8,
  },
  oss_merger: {
    bronze: (a: ArtifactStats) => a.externalPrsMerged >= 1 && a.maxExternalRepoStars >= 100,
    silver: (a: ArtifactStats) => a.externalPrsMerged >= 5 && a.maxExternalRepoStars >= 500,
    gold:   (a: ArtifactStats) => a.externalPrsMerged >= 20 && a.maxExternalRepoStars >= 5000,
  },
  shipped: {
    bronze: (a: ArtifactStats) => a.publishedPackages >= 1 || a.deployedContracts >= 1,
    silver: (a: ArtifactStats) => a.publishedPackages >= 3,
    gold:   (a: ArtifactStats) => a.packageDependents >= 1000 || a.weeklyDownloads >= 1000,
  },
  devops_engineer: {
    bronze: (a: ArtifactStats) => a.devopsCommits >= 50,
    silver: (a: ArtifactStats) => a.devopsCommits >= 200 && a.devopsToolCount >= 3,
    gold:   (a: ArtifactStats) => a.devopsCommits >= 500,
  },
};
```

---

## 9. Subscription & Billing

### 9.1 Plan Matrix

| Feature | Free | Basic ($6/mo) | Pro ($15/mo) |
|---|---|---|---|
| Update frequency | Every 14 days | Every Monday | Real-time |
| On-chain proof publishing | ✓ | ✓ | ✓ |
| Badge minting | ✓ | ✓ | ✓ |
| Public profile page | ✓ | ✓ | ✓ |
| Skill radar chart | ✓ | ✓ | ✓ |
| Advanced analytics | — | — | ✓ |
| API access | — | — | ✓ |
| Priority support | — | ✓ | ✓ |
| Auto-publish threshold | — | — | ✓ |
| GitHub webhook | — | — | ✓ |

### 9.2 Stripe Webhook Handler

```typescript
// app/api/stripe-webhook/route.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sub = event.data.object as Stripe.Subscription;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const plan = sub.items.data[0].price.id === process.env.STRIPE_PRO_PRICE_ID
        ? 'pro' : 'basic';
      await supabase.from('subscriptions').upsert({
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        stripe_price_id: sub.items.data[0].price.id,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
      await supabase.from('users')
        .update({ plan })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }
    case 'customer.subscription.deleted': {
      await supabase.from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id);
      await supabase.from('users')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const user = await supabase.from('users')
        .select('id,plan')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();
      if (user.data) {
        await supabase.from('revenue_events').insert({
          user_id: user.data.id,
          event_type: 'payment_succeeded',
          plan: user.data.plan,
          amount_usd_cents: invoice.amount_paid,
          stripe_event_id: event.id,
        });
      }
      break;
    }
  }
  return new Response('OK');
}
```

### 9.3 Admin Revenue Queries

```sql
-- MRR (current month)
SELECT ROUND(SUM(amount_usd_cents) / 100.0, 2) AS mrr_usd
FROM revenue_events
WHERE event_type = 'payment_succeeded'
  AND created_at >= date_trunc('month', NOW());

-- Subscribers by plan
SELECT plan, COUNT(*) AS count
FROM subscriptions WHERE status = 'active' GROUP BY plan;

-- Monthly churn
SELECT COUNT(*) AS churned_this_month
FROM revenue_events
WHERE event_type = 'subscription_cancelled'
  AND created_at >= date_trunc('month', NOW());

-- Trailing 12-month revenue
SELECT date_trunc('month', created_at) AS month,
       ROUND(SUM(amount_usd_cents) / 100.0, 2) AS revenue_usd
FROM revenue_events
WHERE event_type = 'payment_succeeded'
  AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1 ORDER BY 1;

-- Upgrade funnel
SELECT
  COUNT(*) FILTER (WHERE plan = 'free')  AS free_users,
  COUNT(*) FILTER (WHERE plan = 'basic') AS basic_users,
  COUNT(*) FILTER (WHERE plan = 'pro')   AS pro_users
FROM users;
```

---

## 10. API Route Contracts

### 10.1 Route Inventory

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/wallet` | POST | None | Create/fetch user by STX address |
| `/api/auth/github` | GET | Wallet session | Initiate GitHub OAuth |
| `/api/auth/github/callback` | GET | None | GitHub OAuth callback |
| `/api/analysis/trigger` | POST | Wallet session | Manual analysis trigger |
| `/api/analysis/snapshot` | GET | Wallet session | Latest snapshot |
| `/api/chain/publish` | POST | Wallet session | Build publish tx |
| `/api/chain/profile/[address]` | GET | None | Public on-chain profile |
| `/api/webhooks/github` | POST | HMAC-SHA256 | GitHub push webhook (Pro) |
| `/api/chainhook/artifact` | POST | Bearer token | Chainhook artifact events |
| `/api/chainhook/badge` | POST | Bearer token | Chainhook badge events |
| `/api/stripe-webhook` | POST | Stripe sig | Stripe billing events |
| `/api/billing/checkout` | POST | Wallet session | Create Stripe Checkout Session |
| `/api/billing/portal` | POST | Wallet session | Stripe Customer Portal URL |
| `/api/recruiter/jobs` | GET/POST | Recruiter session | List/create job postings |
| `/api/recruiter/talent` | GET | Recruiter session | Search talent (v1.5) |
| `/api/admin/metrics` | GET | Admin role | Platform metrics |
| `/api/admin/users` | GET | Admin role | User management |
| `/api/cron/analyze-free` | GET | Vercel cron | Batch free-tier analysis |
| `/api/cron/analyze-basic` | GET | Vercel cron | Batch basic-tier analysis |

### 10.2 Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_STACKS_NETWORK` | Client | `'mainnet'` or `'testnet'` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Client | STX address of contract deployer |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe publishable key |
| `HIRO_API_KEY` | Server | Hiro Platform API key |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role — NEVER expose to client |
| `GITHUB_CLIENT_ID` | Server | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Server | GitHub OAuth App client secret |
| `GITHUB_WEBHOOK_SECRET` | Server | HMAC secret for GitHub webhook validation |
| `STRIPE_SECRET_KEY` | Server | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe webhook signing secret |
| `STRIPE_BASIC_PRICE_ID` | Server | Stripe Price ID for Basic plan |
| `STRIPE_PRO_PRICE_ID` | Server | Stripe Price ID for Pro plan |
| `CHAINHOOK_SECRET` | Server | Bearer token for Chainhook receiver |
| `ORACLE_PRIVATE_KEY` | Server | STX private key for oracle wallet — treat as HSM secret |

---

## 11. Security Requirements

### 11.1 Smart Contract Security

- Every oracle-only function **must** check `(asserts! (is-eq tx-sender (var-get oracle-principal)) ERR_UNAUTHORIZED)` as the **first** operation in the function body — no exceptions
- `set-oracle-principal` is restricted to `CONTRACT_OWNER` (the deployer) — document this address and store securely
- All score values **must** be range-validated: `(asserts! (<= score u100) ERR_INVALID_SCORE)` before writing to maps
- GPG bindings are write-once: `bind-gpg-key` must assert `(is-none existing-binding)` before writing
- Run `clarinet check` on every change; maintain ≥ 90% function coverage before mainnet deployment
- Schedule a third-party Clarity audit before mainnet launch for contracts exceeding 200 LOC

### 11.2 API Security

- All webhook receivers must validate signatures before processing payloads (GitHub HMAC-SHA256, Stripe `constructEvent`, Chainhook Bearer)
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side code, `NEXT_PUBLIC_` variables, or responses
- `ORACLE_PRIVATE_KEY` stored in Vercel as a production-only, sensitive environment variable
- Rate limiting: apply sliding window (100 req/15 min per IP) to all public-facing routes
- GitHub OAuth token stored encrypted in Supabase Vault, never returned to client

### 11.3 Oracle Wallet Operations

- Oracle wallet must maintain ≥ 100 STX balance; set up alerting at < 100 STX threshold
- Implement nonce management: track last oracle tx nonce in Supabase to prevent duplicate transactions
- Never run oracle operations from a shared CI environment
- All oracle transactions must include explicit post-conditions to prevent unintended state changes

### 11.4 Fraud Detection (Automated)

Automated flags written to a `fraud_flags` column on the `users` table:

| Flag | Condition | Action |
|---|---|---|
| `burst_repos` | > 40 repos created in 30 days | Auto-flag, reduce trust score cap to 30 |
| `no_external_prs` | Trust score > 80 with 0 external merged PRs | Auto-flag, require manual review |
| `identical_commits` | > 50% of commits share identical diff hashes | Auto-flag, suspend score updates |
| `sudden_spike` | Score increases > 30 points between snapshots | Auto-flag, hold for admin review |

---

## 12. Testing Strategy

### 12.1 Clarity Contract Tests

```typescript
// tests/powr-registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const oracle   = accounts.get('wallet_1')!;
const user1    = accounts.get('wallet_2')!;

describe('powr-registry', () => {
  beforeEach(() => {
    // Set oracle
    simnet.callPublicFn('powr-registry', 'set-oracle-principal',
      [Cl.principal(oracle)], deployer);
  });

  it('user can submit an artifact', () => {
    const r = simnet.callPublicFn('powr-registry', 'submit-artifact',
      [Cl.stringAscii('abc123'), Cl.stringAscii('user/repo'),
       Cl.stringAscii('hash1'), Cl.stringAscii('commit'),
       Cl.stringAscii('backend')], user1);
    expect(r.result).toBeOk(Cl.uint(1));
  });

  it('oracle can verify an artifact', () => {
    simnet.callPublicFn('powr-registry', 'submit-artifact',
      [Cl.stringAscii('abc'), Cl.stringAscii('u/r'),
       Cl.stringAscii('h1'), Cl.stringAscii('commit'),
       Cl.stringAscii('devops')], user1);
    const r = simnet.callPublicFn('powr-registry', 'verify-artifact',
      [Cl.uint(1)], oracle);
    expect(r.result).toBeOk(Cl.bool(true));
  });

  it('non-oracle cannot verify artifact', () => {
    simnet.callPublicFn('powr-registry', 'submit-artifact',
      [Cl.stringAscii('abc'), Cl.stringAscii('u/r'),
       Cl.stringAscii('h1'), Cl.stringAscii('commit'),
       Cl.stringAscii('devops')], user1);
    const r = simnet.callPublicFn('powr-registry', 'verify-artifact',
      [Cl.uint(1)], user1);  // user, not oracle
    expect(r.result).toBeErr(Cl.uint(401));
  });

  it('scores must be <= 100', () => {
    const r = simnet.callPublicFn('powr-registry', 'update-scores',
      [Cl.principal(user1), Cl.uint(101),  // invalid
       Cl.uint(50), Cl.uint(50), Cl.uint(50), Cl.uint(50), Cl.uint(50)], oracle);
    expect(r.result).toBeErr(Cl.uint(422));
  });

  it('gpg binding is write-once', () => {
    simnet.callPublicFn('powr-registry', 'bind-gpg-key',
      [Cl.stringAscii('ABCDEF1234567890ABCDEF1234567890ABCDEF12')], user1);
    const r = simnet.callPublicFn('powr-registry', 'bind-gpg-key',
      [Cl.stringAscii('ABCDEF1234567890ABCDEF1234567890ABCDEF12')], user1);
    expect(r.result).toBeErr(Cl.uint(409));
  });
});
```

### 12.2 API Route Tests

- Jest + Supertest against Supabase local dev instance (`supabase start`)
- Mock Hiro API with `msw` (Mock Service Worker)
- Mock Stripe with `stripe-mock` Docker image: `docker run -p 12111:12111 stripe/stripe-mock`

### 12.3 E2E Tests

- Framework: Playwright
- Target: Stacks Testnet with funded test wallet
- Scope: Full onboarding flow, proof publish flow, badge display, Stripe checkout
- Run: on every PR to `main` via GitHub Actions

---

## 13. Deployment & Infrastructure

### 13.1 Mainnet Deployment Checklist

**Contracts:**
- [ ] `clarinet test --coverage` passes, ≥ 90% coverage
- [ ] `clarinet check` zero errors
- [ ] Contracts reviewed by second engineer
- [ ] Deployed to Stacks Testnet, smoke-tested
- [ ] Deployed to Stacks Mainnet, addresses recorded
- [ ] `set-oracle-principal` called with production oracle wallet address
- [ ] Contract addresses set in Vercel environment variables

**Backend:**
- [ ] All environment variables set in Vercel production
- [ ] Supabase RLS policies enabled and tested
- [ ] Database migrations applied to production instance
- [ ] Stripe products/prices created and IDs set in env vars
- [ ] Stripe webhook endpoint registered with all required events
- [ ] GitHub OAuth App configured with production callback URL
- [ ] Chainhook hooks registered and tested end-to-end

**Frontend:**
- [ ] `NEXT_PUBLIC_STACKS_NETWORK=mainnet`
- [ ] Leather and Xverse connection tested on mainnet
- [ ] Stripe Checkout tested
- [ ] `tsc --noEmit` passes cleanly
- [ ] Lighthouse mobile score ≥ 85

**Operations:**
- [ ] Sentry configured with production DSN
- [ ] Oracle wallet balance monitoring + alert configured
- [ ] Vercel cron jobs scheduled and confirmed active
- [ ] Rollback procedure documented and verified

### 13.2 Rollback Procedure

If a critical production issue occurs post-deployment:

1. Revert the last Vercel deployment via Vercel dashboard (instant, no code change)
2. Disable Chainhook hooks via Hiro Platform dashboard (set inactive)
3. If contract bug: deploy new contract version, update `NEXT_PUBLIC_CONTRACT_ADDRESS` and `POWR_CONTRACT_ADDRESS` in Vercel, redeploy
4. Notify users via status page

> **Note:** Clarity contracts are non-upgradeable. Contract bugs require new deployment. Design contracts conservatively and test exhaustively before mainnet deployment.

---

## 14. Roadmap

| Version | Feature | Status |
|---|---|---|
| **v1.0** | Developer dashboard, on-chain proofs, badge minting, Stacks wallet auth, GitHub OAuth, Free/Basic/Pro tiers, Stripe billing, public profile pages | **This spec** |
| **v1.5** | Recruiter talent search, advanced filtering by verified domain/tools, saved candidates | Planned |
| **v2.0** | Private repo support via local CLI tool, client wallet attestations | Planned |
| **v2.5** | ZK proofs for private contribution verification (Noir) | Research |
| **v3.0** | sBTC staking mechanics — stake STX to vouch for a developer, slashing on fraud | Research |

---

## 15. Appendix

### 15.1 External Resources

| Resource | URL |
|---|---|
| Hiro Documentation | https://docs.hiro.so |
| Stacks Documentation | https://docs.stacks.co |
| Clarity Language Reference | https://docs.stacks.co/clarity/reference |
| Clarinet (contract dev) | https://github.com/hirosystems/clarinet |
| @stacks/connect docs | https://docs.hiro.so/stacks/connect |
| Hiro Stacks API | https://api.hiro.so |
| Hiro Explorer | https://explorer.hiro.so |
| Stacks Testnet Faucet | https://faucet.hiro.so |
| Hiro Platform (Chainhook) | https://platform.hiro.so |
| SIP-009 NFT Standard | https://github.com/stacksgov/sips/blob/main/sips/sip-009 |
| BNS Documentation | https://docs.stacks.co/stacks-101/bitcoin-name-system |
| Leather Wallet | https://leather.io |
| Xverse Wallet | https://xverse.app |
| Supabase Docs | https://supabase.com/docs |
| Stripe Billing API | https://stripe.com/docs/billing |
| GitHub REST API v3 | https://docs.github.com/en/rest |

### 15.2 Glossary

| Term | Definition |
|---|---|
| PoWR | Proof-of-Work Reputation — the platform defined in this document |
| STX | Native token of the Stacks blockchain |
| sBTC | A 1:1 Bitcoin-backed asset on Stacks, enables native BTC DeFi |
| Clarity | Smart contract language on Stacks — interpreted, decidable, non-Turing-complete |
| PoX | Proof of Transfer — Stacks consensus mechanism that anchors block hashes to Bitcoin |
| SIP-009 | Stacks Improvement Proposal defining the NFT standard on Stacks |
| BNS | Bitcoin Name System — human-readable `.btc` names resolved on-chain |
| Chainhook | Hiro's event streaming service — fires HTTP webhooks on contract events |
| Oracle | The PoWR server wallet authorized to write verified data to contracts |
| Artifact | A verifiable unit of work: a commit, merged PR, or published package |
| Snapshot | A point-in-time analysis of a developer's GitHub contributions — stored off-chain |
| Soulbound | An NFT that cannot be transferred — permanently bound to the earning wallet |
| Simnet | Clarinet's local simulation network for contract development and testing |
| Delta sync | Fetching only new GitHub data since the last analysis, not a full re-scan |
| Domain tag | A classification applied to a commit based on files changed: backend, frontend, devops, systems, contracts |

---

*PoWR Technical Specification v2.0 — Stacks Native — March 2026*  
*This document is the authoritative implementation reference. All prior design discussions are superseded.*
