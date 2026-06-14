import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Copy, Check, Trophy, GitCompare } from 'lucide-react'
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
    // Get friends
    const { data: friendData } = await supabase
      .from('pet_friends')
      .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    setFriends(friendData || [])

    // Get leaderboard
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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Friends */}
        <div className="glass">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Friends
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <button className="btn" onClick={generateCode} style={{ marginBottom: '8px', width: '100%' }}>
              Generate Friend Code
            </button>
            {myCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(124,58,237,0.1)', borderRadius: '8px' }}>
                <code style={{ flex: 1, fontSize: '16px', letterSpacing: '2px' }}>{myCode}</code>
                <button onClick={copyCode} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {friends.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No friends yet. Share your code!</p>}
            {friends.map((f) => {
              const friendProfile = f.requester_id === user.id ? f.addressee : f.requester
              if (!friendProfile) return null
              const stage = getStage(friendProfile.pet_xp)
              const mood = getMood(friendProfile)
              const moodData = MOODS[mood as keyof typeof MOODS] || MOODS.neutral

              return (
                <motion.div
                  key={f.id}
                  whileHover={{ scale: 1.02 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setCompareFriend(friendProfile)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{stage.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{friendProfile.pet_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {stage.name} • {friendProfile.pet_xp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                  <span className={moodData.color}>{moodData.icon}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} /> Global Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {leaderboard.map((p, i) => {
              const stage = getStage(p.pet_xp)
              const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''

              return (
                <div key={p.id} className="leaderboard-row" style={{ opacity: p.id === user.id ? 1 : 0.8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`leaderboard-rank ${rankClass}`}>{i + 1}</span>
                    <span style={{ fontSize: '24px' }}>{stage.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.pet_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.username}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold' }}>{p.pet_xp.toLocaleString()} XP</div>
                    <div style={{ fontSize: '12px', color: 'var(--flame)' }}>{p.current_streak} 🔥</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Compare Modal */}
      {compareFriend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setCompareFriend(null)}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="glass"
            style={{ maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCompare size={20} /> Pet Comparison
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '48px' }}>{getStage(compareFriend.pet_xp).emoji}</div>
                <div style={{ fontWeight: 'bold' }}>{compareFriend.pet_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{compareFriend.username}</div>
              </div>
              <div>
                <div style={{ fontSize: '48px' }}>🥚</div>
                <div style={{ fontWeight: 'bold' }}>You</div>
              </div>
            </div>
            <button className="btn" onClick={() => setCompareFriend(null)} style={{ width: '100%', marginTop: '16px' }}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
