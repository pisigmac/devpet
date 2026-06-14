import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom'
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '16px', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', animation: 'breathe 3s ease-in-out infinite' }}>🐛</div>
        <div>Loading your companion...</div>
      </div>
    )
  }

  if (!user) return <Auth onAuth={() => {}} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(250, 248, 245, 0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/" style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', textDecoration: 'none' }}>
          <span style={{ fontSize: '28px' }}>🐛</span> DevPet
        </Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ padding: '8px 14px', borderRadius: 'var(--radius)' }}>Dashboard</NavLink>
          <NavLink to="/social" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ padding: '8px 14px', borderRadius: 'var(--radius)' }}>Social</NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ padding: '8px 14px', borderRadius: 'var(--radius)' }}>Settings</NavLink>
          <button className="btn btn-outline" onClick={() => supabase.auth.signOut()} style={{ padding: '8px 14px', fontSize: '13px', marginLeft: '8px' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <main style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard profile={profile} user={user} />} />
          <Route path="/social" element={<SocialHub user={user} />} />
          <Route path="/settings" element={<Settings profile={profile} user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
        <div className="glass" style={{ maxWidth: '520px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵‍💫</div>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Failed to start</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '16px', background: 'var(--bg)', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', animation: 'breathe 3s ease-in-out infinite' }}>🐛</div>
        <div>Loading {supabaseConfigured ? 'Supabase' : 'local SQLite'}...</div>
      </div>
    )
  }

  return <AppInner />
}

export default App
