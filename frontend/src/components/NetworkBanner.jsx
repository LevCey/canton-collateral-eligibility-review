import { useState, useEffect } from 'react'
import { api } from '../api'

export default function NetworkBanner() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const fetch = async () => { try { setInfo(await api.network()) } catch {} }
    fetch()
    const i = setInterval(fetch, 10000)
    return () => clearInterval(i)
  }, [])

  if (!info) return null

  return (
    <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${info.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{info.network}</span>
        <span className="text-gray-700">·</span>
        <span>{info.participant}</span>
      </div>
      {info.ledger_offset && (
        <span>Ledger offset: {info.ledger_offset.toLocaleString()}</span>
      )}
    </div>
  )
}
