import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Github, Heart } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '48px 36px' }}>
        <div style={{ fontSize: '72px', marginBottom: '20px', animation: 'breathe 4s ease-in-out infinite' }}>🥚</div>
        <h1 style={{ fontSize: '30px', fontWeight: 700, marginBottom: '10px' }}>Welcome to DevPet</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6, fontSize: '15px' }}>
          A digital pet that grows as you code. Connect your GitHub to begin your journey.
        </p>

        <button className="btn" onClick={handleGitHubLogin} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
          <Github size={20} />
          {loading ? 'Connecting...' : 'Continue with GitHub'}
        </button>

        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Heart size={12} /> We only request read access to your public repos and commit history.
          </p>
        </div>
      </div>
    </div>
  )
}
