import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { supabase, initSupabase, supabaseConfigured, Profile } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import SocialHub from './components/SocialHub'
import Settings from './components/Settings'
import './styles.css'

function AppInner() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }

    fetchProfile()

    // Realtime subscription
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => setProfile(payload.new as Profile)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>

  if (!user) return <Auth onAuth={() => {}} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', textDecoration: 'none' }}>
          <span>🐛</span> DevPet
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/social" className="nav-link">Social</Link>
          <Link to="/settings" className="nav-link">Settings</Link>
          <button className="btn btn-outline" onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', fontSize: '14px' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard profile={profile} user={user} />} />
        <Route path="/social" element={<SocialHub user={user} />} />
        <Route path="/settings" element={<Settings profile={profile} user={user} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initSupabase()
      .then(() => setReady(true))
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '24px' }}>
        <div className="glass" style={{ maxWidth: '520px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Failed to start</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
        <div>Loading {supabaseConfigured ? 'Supabase' : 'local SQLite'}...</div>
      </div>
    )
  }

  return <AppInner />
}

export default App
