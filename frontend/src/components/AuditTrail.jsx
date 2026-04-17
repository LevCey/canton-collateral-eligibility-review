export default function AuditTrail({ entries = [] }) {
  if (!entries.length) return null
  return (
    <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/50">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Audit Trail</h3>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
            <span className="text-gray-300 font-medium">{e.event_type}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{e.actor}</span>
            {e.timestamp && e.timestamp !== '1970-01-01T00:00:00Z' && (
              <span className="text-gray-600 text-xs ml-auto">{new Date(e.timestamp).toLocaleTimeString()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
