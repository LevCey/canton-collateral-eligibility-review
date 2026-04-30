#!/usr/bin/env bash
# Demo Reset Script — creates a fresh CollateralReviewCase + 3 ReviewTasks on Canton DevNet.
# Existing contracts are not archived (Canton doesn't support that without exercising Archive).
# This simply creates a new case so the demo starts clean.
#
# Prerequisites: SSH tunnel to DevNet (ssh -fN -L 7575:localhost:7575 root@<YOUR_VPS_IP>)
#
# Usage: ./scripts/demo-reset.sh

set -euo pipefail

API="${CANTON_LEDGER_API_URL:-http://localhost:7575}"
PKG="${CANTON_PACKAGE_NAME:-collateral-review}"

# Party suffix — set to your participant ID
S="${CANTON_PARTY_SUFFIX:-::YOUR_PARTICIPANT_ID}"

OP="OperatingTeam${S}"
CUST="Custodian${S}"
LEGAL="LegalCounsel${S}"
COMP="ComplianceProvider${S}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CMD_ID="reset-$(date +%s)"

echo "=== Demo Reset ==="
echo "API: $API"
echo "Timestamp: $TIMESTAMP"
echo ""

# 1. Create new CollateralReviewCase
echo "Creating CollateralReviewCase..."
RESULT=$(curl -sf "$API/v2/commands/submit-and-wait-for-transaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": {
      \"userId\": \"operatingteam\",
      \"commandId\": \"${CMD_ID}-create\",
      \"actAs\": [\"${OP}\"],
      \"commands\": [{
        \"CreateCommand\": {
          \"templateId\": \"#${PKG}:CollateralReview.Main:CollateralReviewCase\",
          \"createArguments\": {
            \"operatingTeam\": \"${OP}\",
            \"custodian\": \"${CUST}\",
            \"legalCounsel\": \"${LEGAL}\",
            \"complianceProvider\": \"${COMP}\",
            \"assetId\": \"PCN-2026-001\",
            \"assetType\": \"Private Credit Note\",
            \"issuer\": \"Meridian Capital\",
            \"maturity\": \"2027-06-15\",
            \"coupon\": \"5.25%\",
            \"status\": \"UnderReview\",
            \"auditLog\": [{\"eventType\": \"CaseCreated\", \"actor\": \"${OP}\", \"timestamp\": \"${TIMESTAMP}\"}]
          }
        }
      }]
    }
  }")

CASE_CID=$(echo "$RESULT" | python3 -c "import sys,json; events=json.load(sys.stdin)['transaction']['events']; print(next(e['CreatedEvent']['contractId'] for e in events if 'CreatedEvent' in e))")
echo "Case contract: ${CASE_CID:0:40}..."

# 2. Create ReviewTasks
echo "Creating ReviewTasks..."
TASKS=$(curl -sf "$API/v2/commands/submit-and-wait-for-transaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": {
      \"userId\": \"operatingteam\",
      \"commandId\": \"${CMD_ID}-tasks\",
      \"actAs\": [\"${OP}\"],
      \"commands\": [{
        \"ExerciseCommand\": {
          \"templateId\": \"#${PKG}:CollateralReview.Main:CollateralReviewCase\",
          \"contractId\": \"${CASE_CID}\",
          \"choice\": \"CreateReviewTasks\",
          \"choiceArgument\": {}
        }
      }]
    }
  }")

echo "$TASKS" | python3 -c "
import sys, json
events = json.load(sys.stdin)['transaction']['events']
for e in events:
    ce = e.get('CreatedEvent', {})
    if ce:
        role = ce.get('createArgument', {}).get('reviewerRole', '')
        cid = ce.get('contractId', '')[:40]
        print(f'  {role}: {cid}...')
"

echo ""
echo "=== Demo ready! ==="
echo "Case: PCN-2026-001 (Under Review)"
echo "3 ReviewTasks created for Custodian, LegalCounsel, ComplianceProvider"
