const STATUS_STYLES = {
  Eligible: 'bg-green-500/20 text-green-400 border-green-500/30',
  Ineligible: 'bg-red-500/20 text-red-400 border-red-500/30',
  UnderReview: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

export default function StatusBadge({ status }) {
  const label = status === 'UnderReview' ? 'Under Review' : status
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.UnderReview}`}>
      {label || 'Under Review'}
    </span>
  )
}
