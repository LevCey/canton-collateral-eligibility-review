const ROLES = [
  { key: 'operatingteam', label: 'Operating Team', color: 'bg-blue-600' },
  { key: 'custodian', label: 'Custodian', color: 'bg-emerald-600' },
  { key: 'legal', label: 'Legal Counsel', color: 'bg-amber-600' },
  { key: 'compliance', label: 'Compliance', color: 'bg-purple-600' },
]

export default function RoleSwitcher({ selected, onSelect }) {
  return (
    <div className="flex gap-2">
      {ROLES.map(r => (
        <button
          key={r.key}
          onClick={() => onSelect(r.key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === r.key
              ? `${r.color} text-white shadow-lg`
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
