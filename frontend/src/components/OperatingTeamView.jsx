import { useState, useEffect } from 'react'
import { api } from '../api'
import StatusBadge from './StatusBadge'
import AuditTrail from './AuditTrail'

const REVIEWER_LABELS = { custodian: 'Custodian', legal: 'Legal Counsel', compliance: 'Compliance' }

function ReviewerStatus({ results }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(REVIEWER_LABELS).map(([key, label]) => {
        const r = results.find(x => x.reviewer_role === { custodian: 'Custodian', legal: 'LegalCounsel', compliance: 'ComplianceProvider' }[key])
        const status = r ? (r.decision === 'Approve' ? 'approved' : 'rejected') : 'pending'
        const colors = { approved: 'border-green-500 bg-green-500/10', rejected: 'border-red-500 bg-red-500/10', pending: 'border-gray-600 bg-gray-800' }
        return (
          <div key={key} className={`p-4 rounded-lg border ${colors[status]}`}>
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-lg font-semibold capitalize mt-1">{status}</div>
            {r?.rationale && <div className="text-xs text-gray-500 mt-2">{r.rationale}</div>}
          </div>
        )
      })}
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
    const getCid = (role) => {
      const r = results.find(x => x.reviewer_role === role)
      return r?.contract_id || ''
    }
    setLoading(true)
    await api.finalize(contractId, {
      custodian_result_cid: getCid('Custodian'),
      legal_result_cid: getCid('LegalCounsel'),
      compliance_result_cid: getCid('ComplianceProvider'),
    })
    await refresh()
    setLoading(false)
  }

  const activeCase = cases[0]
  // Show active case over old decisions (reset creates new case while old decision persists)
  const decision = !activeCase ? decisions[0] : null
  const allSubmitted = results.length >= 3

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-blue-400">Operating Team Dashboard</h2>

      {decision ? (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">{decision.asset_id}</div>
                <div className="text-sm text-gray-400">Final Eligibility Decision</div>
              </div>
              <StatusBadge status={decision.status} />
            </div>
          </div>
          <AuditTrail entries={decision.audit_log || []} />
        </div>
      ) : activeCase ? (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">{activeCase.asset_id}</div>
                <div className="text-sm text-gray-400">{activeCase.asset_type} · {activeCase.issuer}</div>
              </div>
              <StatusBadge status={activeCase.status} />
            </div>
            <div className="text-xs text-gray-500 mb-4">Maturity: {activeCase.maturity} · Coupon: {activeCase.coupon}</div>
            <ReviewerStatus results={results} />
            {allSubmitted && (
              <button onClick={() => handleFinalize(activeCase.contract_id)} disabled={loading}
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition disabled:opacity-50">
                {loading ? 'Finalizing...' : 'Finalize Decision'}
              </button>
            )}
          </div>
          <AuditTrail entries={activeCase.audit_log || []} />
        </div>
      ) : (
        <button onClick={handleCreate} disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-lg transition disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Review Case'}
        </button>
      )}
    </div>
  )
}
