import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, GitCommit, Code2, Trophy, Zap } from 'lucide-react'
import { supabase, Profile } from '../lib/supabase'
import { getStage, getXpToNext, getMood, MOODS, getLanguageColor } from '../lib/petEngine'
import { syncGitHubData } from '../lib/github'

export default function Dashboard({ profile, user }: { profile: Profile | null; user: any }) {
  const [events, setEvents] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [showEvolve, setShowEvolve] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('coding_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setEvents(data || [])
    }
    fetchEvents()
  }, [user])

  useEffect(() => {
    if (!profile) return
    const stage = getStage(profile.pet_xp)
    if (stage.minXp > 0 && profile.pet_xp >= stage.minXp && profile.pet_xp < stage.minXp + 50) {
      setShowEvolve(true)
      setTimeout(() => setShowEvolve(false), 5000)
    }
  }, [profile?.pet_xp])

  if (!profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'breathe 3s ease-in-out infinite' }}>🥚</div>
          <div>Loading profile...</div>
        </div>
      </div>
    )
  }

  const stage = getStage(profile.pet_xp)
  const nextXp = getXpToNext(profile.pet_xp)
  const mood = getMood(profile)
  const moodData = MOODS[mood as keyof typeof MOODS] || MOODS.neutral

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncGitHubData()
      alert('GitHub data synced successfully!')
    } catch (err: any) {
      alert('Sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <AnimatePresence>
        {showEvolve && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'var(--bg-elevated)', padding: '40px', borderRadius: '24px',
              border: '1px solid var(--border)', zIndex: 100, textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>
              <div style={{ fontSize: '80px' }}>{stage.emoji}</div>
            </motion.div>
            <h2 style={{ marginTop: '16px', fontSize: '24px' }}>Evolution!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Your DevPet evolved into {stage.name}!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Pet Card */}
        <div className="glass" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '360px' }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button className="btn btn-outline" onClick={handleSync} disabled={syncing} style={{ padding: '8px 14px', fontSize: '13px' }}>
              <GitCommit size={14} /> {syncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
          </div>

          <motion.div
            className={`pet-stage-${stage.stage} animate-float`}
            style={{ fontSize: '140px', margin: '24px 0', cursor: 'pointer', filter: 'drop-shadow(0 12px 24px rgba(44, 36, 32, 0.12))' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {stage.emoji}
          </motion.div>

          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>{profile.pet_name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '16px' }}>{stage.desc}</p>

          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--bg-soft)', padding: '10px 18px', borderRadius: '999px', border: '1px solid var(--border)', margin: '0 auto' }}>
            <span className={moodData.color} style={{ fontSize: '22px' }}>{moodData.icon}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{moodData.label}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
              <Zap size={16} /> Total XP
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>{profile.pet_xp.toLocaleString()}</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
              <Flame size={16} className="streak-flame" /> Streak
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700 }} className="streak-flame">
              {profile.current_streak} days
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
              <GitCommit size={16} /> Commits
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {events.filter(e => e.event_type === 'commit').length}
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
              <Trophy size={16} /> Stage
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>{stage.name}</div>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      {nextXp && (
        <div className="glass" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Progress to {getStage(profile.pet_xp + nextXp.remaining).name}</span>
            <span style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>{nextXp.percent}%</span>
          </div>
          <div className="progress-track">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${nextXp.percent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="progress-fill"
            />
          </div>
          <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {nextXp.remaining.toLocaleString()} XP needed to evolve
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="glass">
        <h3 className="section-title">
          <Code2 size={20} /> Recent Activity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
              <p>No activity yet. Start coding to feed your pet!</p>
            </div>
          )}
          {events.slice(0, 10).map((event) => (
            <div key={event.id} className="activity-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '24px' }}>
                  {event.event_type === 'commit' ? '💾' : event.event_type === 'save' ? '✍️' : '⌨️'}
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{event.event_type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    {event.language && <span style={{ color: getLanguageColor(event.language) }}>● {event.language}</span>}
                    {event.repo_name && <span> • {event.repo_name}</span>}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--success)' }}>+{event.xp_value} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
