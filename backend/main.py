"""FastAPI backend for Collateral Eligibility Review — Canton JSON API proxy."""

import os
from contextlib import asynccontextmanager
from typing import Optional

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

TEMPLATE_MODULE = "CollateralReview.Main"
TEMPLATE_ENTITY = "CollateralReviewCase"

ROLE_TO_CHOICE = {
    "custodian": "SubmitCustodianReview",
    "legal": "SubmitLegalReview",
    "compliance": "SubmitComplianceReview",
}

canton: CantonClient


# --- Lifecycle ---
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
    role: str  # custodian | legal | compliance
    decision: str  # approve | reject
    rationale: str


# --- Helpers ---
def _parse_contract(item: dict) -> Optional[dict]:
    """Extract contract data from Canton active-contracts response entry."""
    entry = item.get("contractEntry", {})
    key = next(iter(entry), None)
    if not key:
        return None
    ce = entry[key].get("createdEvent", {})
    args = ce.get("createArgument", {})
    return {
        "contract_id": ce.get("contractId", ""),
        "asset_id": args.get("assetId", ""),
        "asset_type": args.get("assetType", ""),
        "issuer": args.get("issuer", ""),
        "maturity": args.get("maturity", ""),
        "coupon": args.get("coupon", ""),
        "status": args.get("status", ""),
        "custodian_status": _input_status(args.get("custodianInput")),
        "legal_status": _input_status(args.get("legalInput")),
        "compliance_status": _input_status(args.get("complianceInput")),
        "audit_log": _parse_audit(args.get("auditLog", [])),
    }


def _input_status(val) -> str:
    if val is None or val == "None" or (isinstance(val, dict) and "None" in val):
        return "pending"
    # Daml Optional Some wraps as {"Some": {...}}
    inner = val.get("Some", val) if isinstance(val, dict) else val
    if isinstance(inner, dict):
        d = inner.get("decision", "")
        return "approved" if d == "Approve" else "rejected" if d == "Reject" else "pending"
    return "pending"


def _parse_audit(entries) -> list[dict]:
    if not isinstance(entries, list):
        return []
    result = []
    for e in entries:
        if isinstance(e, dict):
            result.append({
                "event_type": e.get("eventType", ""),
                "actor": _short_party(e.get("actor", "")),
                "timestamp": e.get("timestamp", ""),
            })
    return result


def _short_party(party_id: str) -> str:
    return party_id.split("::")[0] if "::" in party_id else party_id


# --- Endpoints ---
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/cases")
async def list_cases(role: str = "operatingteam"):
    role = role.lower()
    party = PARTIES.get(role)
    if not party:
        raise HTTPException(400, f"Unknown role: {role}. Valid: operatingteam, custodian, legal, compliance")
    raw = await canton.query_contracts(party, TEMPLATE_MODULE, TEMPLATE_ENTITY)
    cases = [c for item in raw if (c := _parse_contract(item)) is not None]
    return {"cases": cases}


@app.post("/cases")
async def create_case(req: CreateCaseRequest):
    party = PARTIES["operatingteam"]
    user = USERS["operatingteam"]
    payload = {
        "operatingTeam": party,
        "custodian": PARTIES["custodian"],
        "legalCounsel": PARTIES["legal"],
        "complianceProvider": PARTIES["compliance"],
        "assetId": req.asset_id,
        "assetType": req.asset_type,
        "issuer": req.issuer,
        "maturity": req.maturity,
        "coupon": req.coupon,
        "status": "UnderReview",
        "custodianInput": None,
        "legalInput": None,
        "complianceInput": None,
        "auditLog": [{"eventType": "CaseCreated", "actor": party, "timestamp": "1970-01-01T00:00:00Z"}],
    }
    try:
        result = await canton.create_contract(user, [party], TEMPLATE_MODULE, TEMPLATE_ENTITY, payload)
        return {"success": True, "transaction": result}
    except Exception as e:
        raise HTTPException(502, str(e))


@app.post("/cases/{contract_id}/review")
async def submit_review(contract_id: str, req: SubmitReviewRequest):
    role = req.role.lower()
    choice = ROLE_TO_CHOICE.get(role)
    if not choice:
        raise HTTPException(400, f"Invalid role: {role}. Must be custodian, legal, or compliance.")
    party = PARTIES.get(role)
    user = USERS.get(role)
    if not party or not user:
        raise HTTPException(400, f"Party not configured for role: {role}")
    decision = "Approve" if req.decision.lower() == "approve" else "Reject"
    try:
        result = await canton.exercise_choice(
            user, [party], contract_id, TEMPLATE_MODULE, TEMPLATE_ENTITY, choice,
            {"decision": decision, "rationale": req.rationale},
        )
        return {"success": True, "transaction": result}
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/cases/{contract_id}/audit")
async def get_audit(contract_id: str, role: str = "operatingteam"):
    party = PARTIES.get(role)
    if not party:
        raise HTTPException(400, f"Unknown role: {role}")
    raw = await canton.query_contracts(party, TEMPLATE_MODULE, TEMPLATE_ENTITY)
    for item in raw:
        c = _parse_contract(item)
        if c and c["contract_id"] == contract_id:
            return {"audit_log": c["audit_log"]}
    raise HTTPException(404, "Case not found")
