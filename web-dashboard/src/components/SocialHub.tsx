import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Copy, Check, Trophy, GitCompare, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getStage, MOODS, getMood } from '../lib/petEngine'

export default function SocialHub({ user }: { user: any }) {
  const [friends, setFriends] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [friendCode, setFriendCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [compareFriend, setCompareFriend] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    const { data: friendData } = await supabase
      .from('pet_friends')
      .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    setFriends(friendData || [])

    const { data: lbData } = await supabase
      .from('profiles')
      .select('id, username, pet_name, pet_stage, pet_xp, current_streak')
      .order('pet_xp', { ascending: false })
      .limit(50)

    setLeaderboard(lbData || [])
  }

  const generateCode = async () => {
    const { data } = await supabase.functions.invoke('social-sync', {
      body: { action: 'invite', user_id: user.id },
    })
    if (data?.code) setMyCode(data.code)
  }

  const acceptFriend = async () => {
    await supabase.functions.invoke('social-sync', {
      body: { action: 'accept', user_id: user.id, friend_code: friendCode },
    })
    setFriendCode('')
    fetchData()
  }

  const copyCode = () => {
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Friends */}
      <div className="glass">
        <h3 className="section-title">
          <Users size={20} /> Friends
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <button className="btn" onClick={generateCode} style={{ marginBottom: '10px', width: '100%' }}>
            <Sparkles size={16} /> Generate Friend Code
          </button>
          {myCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--accent-soft)', borderRadius: 'var(--radius)', border: '1px solid var(--accent-glow)' }}>
              <code style={{ flex: 1, fontSize: '18px', letterSpacing: '3px', fontWeight: 600, color: 'var(--accent)' }}>{myCode}</code>
              <button onClick={copyCode} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            placeholder="Enter friend code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={acceptFriend} disabled={!friendCode}>
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {friends.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤝</div>
              <p>No friends yet. Share your code!</p>
            </div>
          )}
          {friends.map((f) => {
            const friendProfile = f.requester_id === user.id ? f.addressee : f.requester
            if (!friendProfile) return null
            const stage = getStage(friendProfile.pet_xp)
            const mood = getMood(friendProfile)
            const moodData = MOODS[mood as keyof typeof MOODS] || MOODS.neutral

            return (
              <motion.div
                key={f.id}
                whileHover={{ scale: 1.01 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setCompareFriend(friendProfile)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '36px' }}>{stage.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{friendProfile.pet_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {stage.name} • {friendProfile.pet_xp.toLocaleString()} XP
                    </div>
                  </div>
                </div>
                <span className={moodData.color} style={{ fontSize: '22px' }}>{moodData.icon}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass">
        <h3 className="section-title">
          <Trophy size={20} /> Global Leaderboard
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leaderboard.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏆</div>
              <p>No leaderboard data yet.</p>
            </div>
          )}
          {leaderboard.map((p, i) => {
            const stage = getStage(p.pet_xp)
            const isTop3 = i < 3

            return (
              <div key={p.id} className="leaderboard-row" style={{ opacity: p.id === user.id ? 1 : 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className={`leaderboard-rank ${isTop3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                  <span style={{ fontSize: '32px' }}>{stage.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.pet_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{p.username}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.pet_xp.toLocaleString()} XP</div>
                  <div style={{ fontSize: '13px', color: 'var(--flame)', fontWeight: 500 }}>{p.current_streak} 🔥</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Compare Modal */}
      <AnimatePresence>
        {compareFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44, 36, 32, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
            onClick={() => setCompareFriend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass"
              style={{ maxWidth: '480px', width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                <GitCompare size={20} /> Pet Comparison
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'center' }}>
                <div style={{ padding: '20px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: '56px' }}>{getStage(compareFriend.pet_xp).emoji}</div>
                  <div style={{ fontWeight: 700, marginTop: '8px' }}>{compareFriend.pet_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{compareFriend.username}</div>
                </div>
                <div style={{ padding: '20px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: '56px' }}>🥚</div>
                  <div style={{ fontWeight: 700, marginTop: '8px' }}>You</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{user.email?.split('@')[0] || 'demo'}</div>
                </div>
              </div>
              <button className="btn" onClick={() => setCompareFriend(null)} style={{ width: '100%', marginTop: '24px' }}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
