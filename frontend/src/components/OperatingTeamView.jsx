import { useState, useEffect } from 'react'
import { api } from '../api'
import StatusBadge from './StatusBadge'
import AuditTrail from './AuditTrail'

const REVIEWERS = [
  { key: 'custodian', label: 'Custodian', damlRole: 'Custodian' },
  { key: 'legal', label: 'Legal Counsel', damlRole: 'LegalCounsel' },
  { key: 'compliance', label: 'Compliance', damlRole: 'ComplianceProvider' },
]

function CaseHeader({ c, reviewsDone }) {
  return (
    <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/30">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xl font-bold text-white">{c.asset_id}</div>
          <div className="text-sm text-gray-400 mt-1">{c.asset_type} · {c.issuer}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Reviews</div>
            <div className="text-sm font-bold text-gray-300">{reviewsDone}/3</div>
          </div>
          <StatusBadge status={c.status} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div><span className="text-gray-500">Maturity</span><div className="text-gray-300 font-medium">{c.maturity}</div></div>
        <div><span className="text-gray-500">Coupon</span><div className="text-gray-300 font-medium">{c.coupon}</div></div>
        <div><span className="text-gray-500">Notional</span><div className="text-gray-300 font-medium">$5,000,000</div></div>
        <div><span className="text-gray-500">Type</span><div className="text-gray-300 font-medium">{c.asset_type}</div></div>
      </div>
    </div>
  )
}

function ReviewerCards({ results }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {REVIEWERS.map(({ key, label, damlRole }) => {
        const r = results.find(x => x.reviewer_role === damlRole)
        const status = r ? (r.decision === 'Approve' ? 'approved' : 'rejected') : 'pending'
        const border = { approved: 'border-green-500/50', rejected: 'border-red-500/50', pending: 'border-gray-700/50' }
        const bg = { approved: 'bg-green-500/5', rejected: 'bg-red-500/5', pending: 'bg-gray-800/30' }
        const dot = { approved: 'bg-green-500', rejected: 'bg-red-500', pending: 'bg-gray-600' }
        return (
          <div key={key} className={`p-4 rounded-xl border ${border[status]} ${bg[status]}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${dot[status]}`} />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-lg font-semibold capitalize text-gray-200">{status}</div>
            {r?.rationale && <div className="text-xs text-gray-500 mt-2 line-clamp-2">{r.rationale}</div>}
            {r?.submitted_at && <div className="text-xs text-gray-600 mt-1">{new Date(r.submitted_at).toLocaleTimeString()}</div>}
          </div>
        )
      })}
    </div>
  )
}

function DecisionSummary({ decision }) {
  const allApproved = decision.audit_log?.every(e =>
    !e.event_type.includes('Result') || e.event_type.includes('Approve')
  )
  const reviewCount = decision.audit_log?.filter(e => e.event_type.includes('Result')).length || 0
  return (
    <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/30">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xl font-bold text-white">{decision.asset_id}</div>
          <div className="text-sm text-gray-400 mt-1">Final Eligibility Decision</div>
        </div>
        <StatusBadge status={decision.status} />
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-3 rounded-lg bg-gray-900/50">
          <div className="text-gray-500 text-xs uppercase tracking-wider">Reviews</div>
          <div className="text-lg font-bold text-gray-200 mt-1">{reviewCount}/3</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-900/50">
          <div className="text-gray-500 text-xs uppercase tracking-wider">Decision</div>
          <div className={`text-lg font-bold mt-1 ${decision.status === 'Eligible' ? 'text-green-400' : 'text-red-400'}`}>
            {decision.status}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gray-900/50">
          <div className="text-gray-500 text-xs uppercase tracking-wider">Path</div>
          <div className="text-sm font-medium text-gray-300 mt-1">
            {allApproved ? 'All approved' : 'Reviewer rejected'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OperatingTeamView() {
  const [cases, setCases] = useState([])
  const [results, setResults] = useState([])
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    const [c, r, d] = await Promise.all([api.listCases(), api.listResults('operatingteam'), api.getDecision('operatingteam')])
    setCases(c.cases || [])
    setResults(r.results || [])
    setDecisions(d.decisions || [])
  }

  useEffect(() => { refresh(); const i = setInterval(refresh, 5000); return () => clearInterval(i) }, [])

  const handleCreate = async () => {
    setLoading(true)
    await api.createCase({})
    await refresh()
    setLoading(false)
  }

  const handleFinalize = async (contractId) => {
    const toDecision = (role) => {
      const r = results.find(x => x.reviewer_role === role)
      return r?.decision === 'Approve' ? 'approve' : 'reject'
    }
    setLoading(true)
    await api.finalize(contractId, {
      custodian_decision: toDecision('Custodian'),
      legal_decision: toDecision('LegalCounsel'),
      compliance_decision: toDecision('ComplianceProvider'),
    })
    await refresh()
    setLoading(false)
  }

  const activeCase = cases[0]
  const decision = !activeCase ? decisions[0] : null
  const reviewsDone = REVIEWERS.filter(({ damlRole }) => results.some(r => r.reviewer_role === damlRole)).length
  const allSubmitted = reviewsDone >= 3

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-blue-400">Operating Team — Case Workbench</h2>

      {decision ? (
        <div className="space-y-4">
          <DecisionSummary decision={decision} />
          <AuditTrail entries={decision.audit_log || []} />
        </div>
      ) : activeCase ? (
        <div className="space-y-4">
          <CaseHeader c={activeCase} reviewsDone={reviewsDone} />
          <ReviewerCards results={results} />
          {allSubmitted && (
            <button onClick={() => handleFinalize(activeCase.contract_id)} disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition disabled:opacity-50">
              {loading ? 'Finalizing...' : 'Finalize Decision'}
            </button>
          )}
          <AuditTrail entries={activeCase.audit_log || []} />
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <button onClick={handleCreate} disabled={loading}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-lg transition disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Review Case'}
          </button>
        </div>
      )}
    </div>
  )
}
