import { useState, useEffect } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Moon, Sun, Save, Github, ExternalLink } from 'lucide-react'
import { getGitHubProfile } from '../lib/github'

interface GitHubProfile {
  login: string
  avatar_url: string
  html_url: string
  name?: string
  bio?: string
  public_repos: number
  followers: number
  following: number
}

export default function Settings({ profile, user }: { profile: Profile | null; user: any }) {
  const [petName, setPetName] = useState(profile?.pet_name || 'DevPet')
  const [theme, setTheme] = useState(profile?.preferred_theme || 'dark')
  const [saving, setSaving] = useState(false)
  const [github, setGithub] = useState<GitHubProfile | null>(null)
  const [loadingGh, setLoadingGh] = useState(true)

  useEffect(() => {
    setPetName(profile?.pet_name || 'DevPet')
    setTheme(profile?.preferred_theme || 'dark')
  }, [profile])

  useEffect(() => {
    getGitHubProfile().then((p) => {
      setGithub(p)
      setLoadingGh(false)
    })
  }, [])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      pet_name: petName,
      preferred_theme: theme,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    alert('Settings saved!')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '680px', margin: '0 auto' }}>
      <div className="glass" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>⚙️</span> Settings
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Pet Name
          </label>
          <input
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="What should we call your companion?"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Theme
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={theme === 'dark' ? 'btn' : 'btn btn-outline'}
              onClick={() => setTheme('dark')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Moon size={16} /> Dark
            </button>
            <button
              className={theme === 'light' ? 'btn' : 'btn btn-outline'}
              onClick={() => setTheme('light')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Sun size={16} /> Light
            </button>
          </div>
        </div>

        <button className="btn" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="glass">
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Github size={20} /> Connected Accounts
        </h3>

        {loadingGh ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading GitHub profile...</p>
        ) : github ? (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={github.avatar_url}
              alt={github.login}
              style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
            />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{github.name || github.login}</span>
                <a href={github.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>
                  <ExternalLink size={14} />
                </a>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '8px' }}>@{github.login}</div>
              {github.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>{github.bio}</p>}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="stat-pill"><strong>{github.public_repos}</strong> repos</div>
                <div className="stat-pill"><strong>{github.followers}</strong> followers</div>
                <div className="stat-pill"><strong>{github.following}</strong> following</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Github size={18} /> GitHub not connected
            </div>
            <button className="btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })}>
              Connect GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
