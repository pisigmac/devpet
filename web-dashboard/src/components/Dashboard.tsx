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

  if (!profile) return <div style={{ padding: '40px' }}>Loading profile...</div>

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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <AnimatePresence>
        {showEvolve && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'var(--bg-card)', padding: '40px', borderRadius: '20px',
              border: '2px solid var(--accent)', zIndex: 100, textAlign: 'center',
              backdropFilter: 'blur(20px)',
            }}
          >
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>
              <div style={{ fontSize: '80px' }}>{stage.emoji}</div>
            </motion.div>
            <h2 style={{ marginTop: '16px' }}>Evolution!</h2>
            <p>Your DevPet evolved into {stage.name}!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Pet Card */}
        <div className="glass" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <button className="btn btn-outline" onClick={handleSync} disabled={syncing} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <GitCommit size={14} /> {syncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
          </div>

          <motion.div
            className={`pet-stage-${stage.stage} animate-float`}
            style={{ fontSize: '120px', margin: '20px 0', cursor: 'pointer' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {stage.emoji}
          </motion.div>

          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{profile.pet_name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{stage.desc}</p>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className={moodData.color} style={{ fontSize: '20px' }}>{moodData.icon}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{moodData.label}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Zap size={16} /> Total XP
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{profile.pet_xp.toLocaleString()}</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Flame size={16} className="streak-flame" /> Streak
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }} className="streak-flame">
              {profile.current_streak} days
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <GitCommit size={16} /> Commits
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {events.filter(e => e.event_type === 'commit').length}
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Trophy size={16} /> Stage
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stage.name}</div>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      {nextXp && (
        <div className="glass" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Progress to {getStage(profile.pet_xp + nextXp.remaining).name}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{nextXp.percent}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${nextXp.percent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), #ff6b35)', borderRadius: '4px' }}
            />
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {nextXp.remaining.toLocaleString()} XP needed to evolve
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="glass">
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={20} /> Recent Activity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No activity yet. Start coding to feed your pet!</p>}
          {events.slice(0, 10).map((event) => (
            <div key={event.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>
                  {event.event_type === 'commit' ? '💾' : event.event_type === 'save' ? '✍️' : '⌨️'}
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{event.event_type.replace('_', ' ')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {event.language && <span style={{ color: getLanguageColor(event.language) }}>● {event.language}</span>}
                    {event.repo_name && <span> • {event.repo_name}</span>}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>+{event.xp_value} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
