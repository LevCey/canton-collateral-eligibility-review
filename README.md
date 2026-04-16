# RWA Collateral Eligibility Review

RWA Collateral Eligibility Review is a Canton-native application for privacy-aware collateral review in tokenized private credit workflows.

The product is designed for an Operating Team / Collateral Operations team that needs input from custodians, legal reviewers, and compliance reviewers to decide whether a tokenized private credit note can be accepted as collateral.

Instead of relying on email, spreadsheets, bilateral follow-up, and scattered documentation, the workflow coordinates private reviewer inputs and produces one shared, auditable eligibility decision.

## Core Thesis

Private collateral data can still produce one shared, auditable eligibility decision.

This repository is focused on proving that thesis through:

- product strategy
- demo planning
- submission materials
- project framing for HackCanton Season #1

## Why Canton

This use case depends on:

- selective visibility
- multi-party coordination
- shared state
- auditability

Canton is a strong fit because the workflow requires multiple participants to contribute to one decision without exposing all sensitive data to all parties.

## Current Product Framing

The commercial strategy is operator-first:

- primary buyer: collateral operations lead or risk operations lead at a tokenized private credit platform
- first product: internal-first collateral eligibility review workflow
- counterparties: invited workflow participants, not first-day customers

The starting point is not a network sale. The starting point is one operator removing a painful manual process.

## Demo Direction

The demo focuses on one asset and one decision:

- asset: tokenized private credit note
- decision: is this note eligible as collateral?

The core demo moment is:

- private reviewer inputs go in
- one shared decision comes out
- the result is auditable

## Repository Contents

- [STRATEGY.md](./STRATEGY.md): product, submission, and commercial strategy
- [DEMO_PLAN.md](./DEMO_PLAN.md): judge-facing demo structure and wow moment
- [submission/](./submission): hackathon submission materials
- [assets/logo/](./assets/logo): project logo assets

## Current Status

The repository currently contains planning, positioning, and submission documents.

Next steps:

- build the live Canton demo
- measure real workflow metrics from a canonical demo run
- complete submission assets and public repo polish

## Track Fit

Primary track:

- Real-World Asset (RWA) & Business Workflows

## License

TBD
