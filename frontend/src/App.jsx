import { useState } from 'react'
import RoleSwitcher from './components/RoleSwitcher'
import OperatingTeamView from './components/OperatingTeamView'
import ReviewerView from './components/ReviewerView'

export default function App() {
  const [role, setRole] = useState('operatingteam')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Collateral Eligibility Review</h1>
            <p className="text-xs text-gray-500">Canton Network · Private Credit Note</p>
          </div>
          <RoleSwitcher selected={role} onSelect={setRole} />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {role === 'operatingteam' ? <OperatingTeamView /> : <ReviewerView role={role} />}
      </main>
    </div>
  )
}
