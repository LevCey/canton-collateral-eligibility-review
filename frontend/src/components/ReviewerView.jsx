import { useState, useEffect } from 'react'
import { api } from '../api'
import StatusBadge from './StatusBadge'

const ROLE_META = {
  custodian: { label: 'Custodian', damlRole: 'Custodian', color: '#34d399', desc: 'Verify custody status and lien/encumbrance status of the asset.' },
  legal: { label: 'Legal Counsel', damlRole: 'LegalCounsel', color: '#fbbf24', desc: 'Assess legal enforceability, jurisdiction fit, and restrictions.' },
  compliance: { label: 'Compliance Provider', damlRole: 'ComplianceProvider', color: '#a78bfa', desc: 'Review sanctions, AML, and regulatory policy compliance.' },
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
  const decision = !task && !submitted ? decisions[0] : null

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold" style={{ color: meta.color }}>{meta.label} — Review Task</h2>

      {decision ? (
        <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold text-white">{decision.asset_id}</div>
            <StatusBadge status={decision.status} />
          </div>
          <p className="text-sm text-gray-400">Final eligibility decision has been issued.</p>
        </div>
      ) : submitted ? (
        <div className="p-8 rounded-xl border border-green-500/20 bg-green-500/5 text-center">
          <div className="text-3xl mb-3">✓</div>
          <div className="text-lg font-semibold text-green-400">Review Submitted</div>
          <p className="text-sm text-gray-500 mt-1">Waiting for other reviewers and final decision.</p>
        </div>
      ) : task ? (
        <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/30 space-y-5">
          <div>
            <div className="text-lg font-bold text-white">{task.asset_id}</div>
            <div className="text-sm text-gray-400 mt-1">{task.asset_type} · {task.issuer}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/30">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Task</div>
            <p className="text-sm text-gray-300">{meta.desc}</p>
          </div>
          <textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder="Rationale (optional)"
            className="w-full p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm resize-none h-20 focus:border-gray-500 outline-none placeholder-gray-600"
          />
          <div className="flex gap-3">
            <button onClick={() => handleSubmit('approve')} disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Approve'}
            </button>
            <button onClick={() => handleSubmit('reject')} disabled={loading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium transition disabled:opacity-50">
              {loading ? 'Submitting...' : 'Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-gray-700/50 bg-gray-800/30 text-center text-gray-500">
          No pending review tasks.
        </div>
      )}
    </div>
  )
}
