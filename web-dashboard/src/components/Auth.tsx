import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Github } from 'lucide-react'

export default function Auth({ onAuth: _onAuth }: { onAuth: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleGitHubLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass" style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🥚</div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome to DevPet</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          A digital pet that evolves as you code. Connect your GitHub to begin your journey.
        </p>

        <button className="btn" onClick={handleGitHubLogin} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          <Github size={20} />
          {loading ? 'Connecting...' : 'Continue with GitHub'}
        </button>

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          We only request read access to your public repos and commit history.
        </p>
      </div>
    </div>
  )
}
