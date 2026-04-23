import { useState, useEffect } from 'react'
import { api } from '../api'
import StatusBadge from './StatusBadge'

const ROLE_META = {
  custodian: { label: 'Custodian', damlRole: 'Custodian', desc: 'Verify custody status and lien/encumbrance status.' },
  legal: { label: 'Legal Counsel', damlRole: 'LegalCounsel', desc: 'Assess legal enforceability and jurisdiction fit.' },
  compliance: { label: 'Compliance Provider', damlRole: 'ComplianceProvider', desc: 'Review sanctions, AML, and regulatory policy.' },
}

export default function ReviewerView({ role }) {
  const meta = ROLE_META[role]
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rationale, setRationale] = useState('')

  const refresh = async () => {
    const [t, d] = await Promise.all([api.listTasks(role), api.getDecision(role)])
    setTasks(t.tasks || [])
    setDecisions(d.decisions || [])
    if ((t.tasks || []).length === 0 && (d.decisions || []).length === 0) {
      // Check if already submitted (no task = consumed)
      const r = await api.listResults(role)
      if ((r.results || []).some(x => x.reviewer_role === meta.damlRole)) setSubmitted(true)
    }
  }

  useEffect(() => { setSubmitted(false); setRationale(''); refresh(); const i = setInterval(refresh, 5000); return () => clearInterval(i) }, [role])

  const handleSubmit = async (decision) => {
    const task = tasks[0]
    if (!task) return
    setLoading(true)
    await api.submitReview(task.contract_id, { role, decision, rationale: rationale || `${meta.label} ${decision}` })
    setSubmitted(true)
    setLoading(false)
    refresh()
  }

  const task = tasks[0]
  // Show task if available (new case), even if old decisions exist
  const decision = !task && !submitted ? decisions[0] : null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: role === 'custodian' ? '#34d399' : role === 'legal' ? '#fbbf24' : '#a78bfa' }}>
        {meta.label} View
      </h2>

      {decision ? (
        <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{decision.asset_id}</div>
            <StatusBadge status={decision.status} />
          </div>
          <p className="text-sm text-gray-400 mt-2">Final eligibility decision has been issued.</p>
        </div>
      ) : submitted ? (
        <div className="p-6 rounded-xl border border-green-500/30 bg-green-500/10 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="font-semibold text-green-400">Review Submitted</div>
          <p className="text-sm text-gray-400 mt-1">Waiting for other reviewers and final decision.</p>
        </div>
      ) : task ? (
        <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/50 space-y-4">
          <div>
            <div className="text-lg font-semibold">{task.asset_id}</div>
            <div className="text-sm text-gray-400">{task.asset_type} · {task.issuer}</div>
          </div>
          <p className="text-sm text-gray-500">{meta.desc}</p>
          <textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder="Rationale (optional)"
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm resize-none h-20 focus:border-gray-500 outline-none"
          />
          <div className="flex gap-3">
            <button onClick={() => handleSubmit('approve')} disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Approve'}
            </button>
            <button onClick={() => handleSubmit('reject')} disabled={loading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/50 text-center text-gray-500">
          No pending review tasks.
        </div>
      )}
    </div>
  )
}
