# RWA Collateral Eligibility Review

A Canton-native application for privacy-aware collateral eligibility review in tokenized private credit workflows.

One Operating Team coordinates private inputs from a Custodian, Legal Counsel, and Compliance Provider to produce a shared, auditable eligibility decision — without exposing each reviewer's data to the others.

## How It Works

```
Operating Team creates a review case for a tokenized private credit note
  │
  ├── Custodian receives a private task → submits custody verification
  ├── Legal Counsel receives a private task → submits legal assessment
  └── Compliance Provider receives a private task → submits compliance review
  │
  ▼
Operating Team finalizes → shared Eligible / Ineligible decision
  │
  ▼
All parties see the final decision + audit trail
```

Each reviewer sees only their own task. They cannot see each other's inputs or the orchestrator case. The final decision is shared with all participants.

## Privacy Model

This application uses per-reviewer contracts to enforce real Canton privacy:

| Contract | Visible To |
|----------|-----------|
| `CollateralReviewCase` | Operating Team only |
| `ReviewTask` (per reviewer) | Operating Team + that reviewer only |
| `ReviewResult` | Operating Team + submitting reviewer |
| `EligibilityDecision` | All four parties |

Privacy guarantees are enforced on-ledger and verified by Daml tests.

## Architecture

```
┌─────────────────────────────┐
│   Frontend (React + Tailwind)│  Role switcher, review forms,
│   Role-based views           │  status dashboard, audit trail
└──────────────┬──────────────┘
               │ HTTP
┌──────────────▼──────────────┐
│   Backend (FastAPI)          │  Canton JSON API v2 proxy
│   Role → Party mapping       │  Create, exercise, query
└──────────────┬──────────────┘
               │ JSON API v2
┌──────────────▼──────────────┐
│   Canton DevNet              │  Daml contracts
│   4 parties, per-reviewer    │  Selective visibility
│   task contracts             │  Auditable decisions
└─────────────────────────────┘
```

## Project Structure

```
├── daml/                          # Daml smart contracts
│   ├── CollateralReview/Main.daml # Templates: ReviewTask, ReviewResult,
│   │                              # CollateralReviewCase, EligibilityDecision
│   ├── Setup.daml                 # Party allocation + demo case
│   └── Test.daml                  # 8 tests including privacy assertions
├── backend/                       # FastAPI service
│   ├── main.py                    # REST endpoints
│   ├── canton_client.py           # Canton JSON API v2 client
│   └── .env.example               # Configuration template
├── frontend/                      # React SPA
│   ├── src/App.jsx                # Role switching shell
│   └── src/components/            # OperatingTeamView, ReviewerView,
│                                  # RoleSwitcher, AuditTrail, StatusBadge
└── daml.yaml                      # Daml SDK 3.4.10
```

## Daml Tests

8 passing tests covering workflow logic and privacy:

| Test | What It Proves |
|------|---------------|
| `testHappyPath` | 3 approvals → Eligible |
| `testRejection` | 1 rejection → Ineligible |
| `testWrongParty` | Custodian cannot exercise Legal's choice |
| `testDoubleSubmit` | Reviewer cannot submit twice |
| `testPrivacy` | Custodian cannot see Legal's task |
| `testReviewerCannotSeeCase` | Reviewer cannot see orchestrator |
| `testDecisionVisibility` | Final decision visible to all |
| `testPartialState` | Partial submissions → Under Review |

## Quick Start

### Daml

```bash
daml build
daml test
```

### Backend

```bash
cd backend
cp .env.example .env    # configure Canton API URL and party IDs
pip install -r requirements.txt
uvicorn main:app --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env    # set VITE_API_URL
npm install
npm run dev
```

## Demo Scenario

- **Asset:** Tokenized private credit note (PCN-2026-001)
- **Issuer:** Meridian Capital
- **Decision:** Is this note eligible as collateral?
- **Roles:** Operating Team, Custodian, Legal Counsel, Compliance Provider

## Why Canton

This workflow depends on properties that are difficult to reproduce elsewhere:

- **Selective visibility** — each reviewer sees only their own task
- **Multi-party coordination** — one team coordinates multiple private reviewers
- **Shared state** — all parties rely on the same eligibility decision
- **Auditability** — the full decision lifecycle is recorded on-ledger

## Track

HackCanton Season #1 — Track 1: RWA & Business Workflows

## License

MIT
