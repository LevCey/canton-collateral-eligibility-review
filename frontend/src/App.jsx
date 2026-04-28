import { useState, useEffect } from 'react'
import { api } from './api'
import RoleSwitcher from './components/RoleSwitcher'
import OperatingTeamView from './components/OperatingTeamView'
import ReviewerView from './components/ReviewerView'

export default function App() {
  const [role, setRole] = useState('operatingteam')
  const [network, setNetwork] = useState(null)

  useEffect(() => {
    const check = () => api.network().then(setNetwork).catch(() => setNetwork(null))
    check()
    const i = setInterval(check, 10000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800/50 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight">Collateral Eligibility Review</h1>
            <p className="text-[11px] text-gray-600">Canton Network · Private Credit Note</p>
          </div>
          <RoleSwitcher selected={role} onSelect={setRole} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {role === 'operatingteam' ? <OperatingTeamView /> : <ReviewerView role={role} />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-800/30 bg-gray-950/90 backdrop-blur px-6 py-1.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-gray-600">
          <span>LeventLabs · HackCanton Season #1</span>
          {network?.connected ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Canton DevNet · offset {network.ledger_offset?.toLocaleString()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Disconnected
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
