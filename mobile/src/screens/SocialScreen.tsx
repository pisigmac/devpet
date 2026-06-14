import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { getStage, MOODS, getMood, Profile } from '../lib/petEngine';

export default function SocialScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [myCode, setMyCode] = useState('');
  const [friendCode, setFriendCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: friendData } = await supabase
      .from('pet_friends')
      .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');
    setFriends(friendData || []);

    const { data: lb } = await supabase
      .from('profiles')
      .select('id, username, pet_name, pet_stage, pet_xp, current_streak')
      .order('pet_xp', { ascending: false })
      .limit(50);
    setLeaderboard(lb || []);
  }

  async function generateCode() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.functions.invoke('social-sync', {
      body: { action: 'invite', user_id: user.id },
    });
    if (data?.code) setMyCode(data.code);
  }

  async function addFriend() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.functions.invoke('social-sync', {
      body: { action: 'accept', user_id: user.id, friend_code: friendCode },
    });
    setFriendCode('');
    fetchData();
    Alert.alert('Friend added!');
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌐 Social Hub</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite Friends</Text>
        <TouchableOpacity style={styles.button} onPress={generateCode}>
          <Text style={styles.buttonText}>{myCode ? 'Regenerate Code' : 'Generate Friend Code'}</Text>
        </TouchableOpacity>
        {myCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{myCode}</Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={addFriend}>
            <Text style={styles.buttonText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Friends</Text>
      {friends.length === 0 && <Text style={styles.emptyText}>No friends yet. Share your code!</Text>}
      {friends.map(f => {
        const friendProfile = f.requester_id === (supabase.auth.getUser() as any)?.id ? f.addressee : f.requester;
        if (!friendProfile) return null;
        const stage = getStage(friendProfile.pet_xp);
        const mood = getMood(friendProfile);
        const moodData = MOODS[mood as keyof typeof MOODS] || MOODS.neutral;
        return (
          <View key={f.id} style={styles.friendCard}>
            <Text style={styles.friendEmoji}>{stage.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendName}>{friendProfile.pet_name}</Text>
              <Text style={styles.friendMeta}>{stage.name} • {friendProfile.pet_xp.toLocaleString()} XP</Text>
            </View>
            <Text style={{ color: moodData.color }}>{moodData.icon}</Text>
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
      {leaderboard.map((p, i) => {
        const stage = getStage(p.pet_xp);
        const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#94a3b8';
        return (
          <View key={p.id} style={styles.leaderRow}>
            <Text style={[styles.rankText, { color: rankColor }]}>{i + 1}</Text>
            <Text style={styles.leaderEmoji}>{stage.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderName}>{p.pet_name}</Text>
              <Text style={styles.leaderMeta}>{p.username}</Text>
            </View>
            <Text style={styles.leaderXp}>{p.pet_xp.toLocaleString()} XP</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 20 },
  section: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#f8fafc', marginBottom: 12 },
  button: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  codeBox: { backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  codeText: { color: '#f8fafc', fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginVertical: 12 },
  friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  friendEmoji: { fontSize: 32 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  friendMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rankText: { fontSize: 18, fontWeight: '700', width: 30, textAlign: 'center' },
  leaderEmoji: { fontSize: 24 },
  leaderName: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  leaderMeta: { fontSize: 12, color: '#94a3b8' },
  leaderXp: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
});
