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
│   └── Test.daml                  # 9 tests including privacy assertions
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

9 passing tests covering workflow logic and privacy:

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
| `testDuplicateCreateTasks` | Cannot create review tasks twice |

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
- **Notional:** $5,000,000 (UI display only — not stored on-ledger)
- **Decision:** Is this note eligible as collateral?
- **Roles:** Operating Team, Custodian, Legal Counsel, Compliance Provider

### Happy Path

All reviewers approve → **Eligible**. This is the primary demo flow.

### Rejection Path

If any reviewer rejects, the same workflow produces an **Ineligible** decision. The rejecting reviewer is recorded in the on-ledger audit trail; their rationale is stored in the `ReviewResult` contract (visible to the Operating Team). This is tested on-ledger (`testRejection`) and works end-to-end — the demo focuses on the happy path for clarity.

## Why Canton

This workflow depends on properties that are difficult to reproduce elsewhere:

- **Selective visibility** — each reviewer sees only their own task
- **Multi-party coordination** — one team coordinates multiple private reviewers
- **Shared state** — all parties rely on the same eligibility decision
- **Auditability** — the full decision lifecycle is recorded on-ledger

## Known Limitations

This is a hackathon MVP. The following are known simplifications:

- **No frontend authentication.** The role switcher is a demo tool. Real privacy is enforced by Canton's party model on-ledger, not by the UI. Production would use per-party auth (JWT/mTLS).
- **Backend role-to-party mapping is a demo simplification.** The backend submits commands on behalf of parties based on role name. Production would require each party to authenticate independently.
- **No historical case management.** Multiple demo resets leave old contracts on the ledger. The frontend prioritizes active cases/tasks, but a clean environment is recommended for demos.
- **Demo-grade error handling.** Failed Canton calls return generic 502 errors. Production would need structured error responses and retry logic.
- **No document upload, notifications, or exception workflows.** The MVP covers the core review-and-decide flow only.

## Track

HackCanton Season #1 — Track 1: RWA & Business Workflows

## License

MIT
