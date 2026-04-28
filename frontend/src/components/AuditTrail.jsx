export default function AuditTrail({ entries = [] }) {
  if (!entries.length) return null

  const eventColors = {
    CaseCreated: 'bg-blue-500',
    'Decision:Eligible': 'bg-green-500',
    'Decision:Ineligible': 'bg-red-500',
  }

  const getColor = (type) => {
    if (eventColors[type]) return eventColors[type]
    if (type.includes('Result')) return type.includes('Reject') ? 'bg-red-400' : 'bg-emerald-400'
    return 'bg-gray-500'
  }

  return (
    <div className="p-5 rounded-xl border border-gray-700/50 bg-gray-800/30">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Audit Trail</h3>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-700/50" />
        <div className="space-y-4">
          {entries.map((e, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              <div className={`w-[15px] h-[15px] rounded-full ${getColor(e.event_type)} shrink-0 mt-0.5 ring-2 ring-gray-900`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200">{e.event_type}</div>
                <div className="text-xs text-gray-500">{e.actor}</div>
              </div>
              {e.timestamp && e.timestamp !== '1970-01-01T00:00:00Z' && (
                <div className="text-xs text-gray-600 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
