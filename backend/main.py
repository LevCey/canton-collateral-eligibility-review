"""FastAPI backend for Collateral Eligibility Review — Canton JSON API proxy."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from canton_client import CantonClient

load_dotenv()

# --- Config ---
CANTON_URL = os.getenv("CANTON_LEDGER_API_URL", "http://localhost:7575")
PKG = os.getenv("CANTON_PACKAGE_NAME", "collateral-eligibility-review")

PARTIES = {
    "operatingteam": os.getenv("PARTY_OPERATING_TEAM", ""),
    "custodian": os.getenv("PARTY_CUSTODIAN", ""),
    "legal": os.getenv("PARTY_LEGAL", ""),
    "compliance": os.getenv("PARTY_COMPLIANCE", ""),
}
USERS = {
    "operatingteam": os.getenv("USER_OPERATING_TEAM", "operatingteam"),
    "custodian": os.getenv("USER_CUSTODIAN", "custodian"),
    "legal": os.getenv("USER_LEGAL", "legalcounsel"),
    "compliance": os.getenv("USER_COMPLIANCE", "complianceprovider"),
}

MOD = "CollateralReview.Main"

ROLE_TO_REVIEWER_ROLE = {
    "custodian": "Custodian",
    "legal": "LegalCounsel",
    "compliance": "ComplianceProvider",
}

canton: CantonClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    global canton
    canton = CantonClient(CANTON_URL, PKG)
    yield
    await canton.close()


app = FastAPI(title="Collateral Eligibility Review", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# --- Models ---
class CreateCaseRequest(BaseModel):
    asset_id: str = "PCN-2026-001"
    asset_type: str = "Private Credit Note"
    issuer: str = "Meridian Capital"
    maturity: str = "2027-06-15"
    coupon: str = "5.25%"


class SubmitReviewRequest(BaseModel):
    role: str       # custodian | legal | compliance
    decision: str   # approve | reject
    rationale: str


class FinalizeRequest(BaseModel):
    custodian_decision: str   # approve | reject
    legal_decision: str
    compliance_decision: str


# --- Helpers ---
def _get_party(role: str) -> str:
    role = role.lower()
    p = PARTIES.get(role)
    if not p:
        raise HTTPException(400, f"Unknown role: {role}")
    return p


def _decision_str(d: str) -> str:
    return "Approve" if d.lower() == "approve" else "Reject"


def _short(party_id: str) -> str:
    return party_id.split("::")[0] if "::" in party_id else party_id


def _parse_case(item: dict) -> dict | None:
    ce = _get_created_event(item)
    if not ce:
        return None
    args = ce.get("createArgument", {})
    return {
        "contract_id": ce.get("contractId", ""),
        "asset_id": args.get("assetId", ""),
        "asset_type": args.get("assetType", ""),
        "issuer": args.get("issuer", ""),
        "maturity": args.get("maturity", ""),
        "coupon": args.get("coupon", ""),
        "status": args.get("status", "UnderReview"),
        "audit_log": _parse_audit(args.get("auditLog", [])),
    }


def _parse_task(item: dict) -> dict | None:
    ce = _get_created_event(item)
    if not ce:
        return None
    args = ce.get("createArgument", {})
    return {
        "contract_id": ce.get("contractId", ""),
        "reviewer_role": args.get("reviewerRole", ""),
        "asset_id": args.get("assetId", ""),
        "asset_type": args.get("assetType", ""),
        "issuer": args.get("issuer", ""),
    }


def _parse_result(item: dict) -> dict | None:
    ce = _get_created_event(item)
    if not ce:
        return None
    args = ce.get("createArgument", {})
    return {
        "contract_id": ce.get("contractId", ""),
        "reviewer_role": args.get("reviewerRole", ""),
        "decision": args.get("decision", ""),
        "rationale": args.get("rationale", ""),
        "submitted_at": args.get("submittedAt", ""),
    }


def _parse_decision(item: dict) -> dict | None:
    ce = _get_created_event(item)
    if not ce:
        return None
    args = ce.get("createArgument", {})
    return {
        "contract_id": ce.get("contractId", ""),
        "asset_id": args.get("assetId", ""),
        "status": args.get("status", ""),
        "audit_log": _parse_audit(args.get("auditLog", [])),
    }


def _get_created_event(item: dict) -> dict | None:
    entry = item.get("contractEntry", {})
    key = next(iter(entry), None)
    return entry[key].get("createdEvent", {}) if key else None


def _parse_audit(entries) -> list[dict]:
    if not isinstance(entries, list):
        return []
    return [
        {"event_type": e.get("eventType", ""), "actor": _short(e.get("actor", "")), "timestamp": e.get("timestamp", "")}
        for e in entries if isinstance(e, dict)
    ]


# --- Endpoints ---
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/cases")
async def list_cases():
    """List active review cases (Operating Team view)."""
    party = _get_party("operatingteam")
    raw = await canton.query_contracts(party, MOD, "CollateralReviewCase")
    return {"cases": [c for item in raw if (c := _parse_case(item))]}


@app.post("/cases")
async def create_case(req: CreateCaseRequest):
    """Create a new review case and its reviewer tasks."""
    party = _get_party("operatingteam")
    user = USERS["operatingteam"]
    payload = {
        "operatingTeam": party,
        "custodian": PARTIES["custodian"],
        "legalCounsel": PARTIES["legal"],
        "complianceProvider": PARTIES["compliance"],
        "assetId": req.asset_id, "assetType": req.asset_type,
        "issuer": req.issuer, "maturity": req.maturity, "coupon": req.coupon,
        "status": "UnderReview",
        "auditLog": [{"eventType": "CaseCreated", "actor": party, "timestamp": "1970-01-01T00:00:00Z"}],
    }
    try:
        result = await canton.create_contract(user, [party], MOD, "CollateralReviewCase", payload)
        # Extract case contract ID and create review tasks
        events = _extract_events(result)
        case_cid = events[0]["contractId"] if events else None
        if case_cid:
            await canton.exercise_choice(user, [party], case_cid, MOD, "CollateralReviewCase", "CreateReviewTasks", {})
        return {"success": True, "case_contract_id": case_cid}
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/tasks")
async def list_tasks(role: str):
    """List pending review tasks for a specific reviewer role."""
    party = _get_party(role)
    user = USERS.get(role.lower())
    raw = await canton.query_contracts(party, MOD, "ReviewTask")
    return {"tasks": [t for item in raw if (t := _parse_task(item))]}


@app.post("/tasks/{contract_id}/review")
async def submit_review(contract_id: str, req: SubmitReviewRequest):
    """Submit a review on a task contract."""
    role = req.role.lower()
    party = _get_party(role)
    user = USERS.get(role)
    if not user:
        raise HTTPException(400, f"No user configured for role: {role}")
    try:
        result = await canton.exercise_choice(
            user, [party], contract_id, MOD, "ReviewTask", "SubmitReview",
            {"decision": _decision_str(req.decision), "rationale": req.rationale},
        )
        return {"success": True, "transaction": result}
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/results")
async def list_results(role: str = "operatingteam"):
    """List submitted review results (visible to OpTeam and the submitting reviewer)."""
    party = _get_party(role)
    raw = await canton.query_contracts(party, MOD, "ReviewResult")
    return {"results": [r for item in raw if (r := _parse_result(item))]}


@app.post("/cases/{contract_id}/finalize")
async def finalize_decision(contract_id: str, req: FinalizeRequest):
    """Finalize the eligibility decision (Operating Team only)."""
    party = _get_party("operatingteam")
    user = USERS["operatingteam"]
    try:
        result = await canton.exercise_choice(
            user, [party], contract_id, MOD, "CollateralReviewCase", "FinalizeDecision",
            {
                "custodianDecision": _decision_str(req.custodian_decision),
                "legalDecision": _decision_str(req.legal_decision),
                "complianceDecision": _decision_str(req.compliance_decision),
            },
        )
        return {"success": True, "transaction": result}
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/decision")
async def get_decision(role: str = "operatingteam"):
    """Get the final eligibility decision (visible to all parties)."""
    party = _get_party(role)
    raw = await canton.query_contracts(party, MOD, "EligibilityDecision")
    decisions = [d for item in raw if (d := _parse_decision(item))]
    return {"decisions": decisions}


def _extract_events(tx_result: dict) -> list[dict]:
    """Extract created events from a transaction result."""
    tx = tx_result.get("transaction", {})
    events = tx.get("events", [])
    return [e.get("CreatedEvent", e) for e in events if "CreatedEvent" in e or "contractId" in e]
