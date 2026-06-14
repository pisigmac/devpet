import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile, getStage, getXpToNext, getMood, MOODS, SKIN_EFFECTS } from '../lib/petEngine';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PetScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
    const sub = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        const newProfile = payload.new as Profile;
        if (newProfile.id === profile?.id) {
          checkEvolution(profile, newProfile);
          setProfile(newProfile);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation for premium skins
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function fetchProfile() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
    setLoading(false);
  }

  async function checkEvolution(oldProfile: Profile | null, newProfile: Profile) {
    if (!oldProfile) return;
    const oldStage = getStage(oldProfile.pet_xp).stage;
    const newStage = getStage(newProfile.pet_xp).stage;
    if (newStage > oldStage) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Evolution!',
          body: `${newProfile.pet_name} evolved into ${getStage(newProfile.pet_xp).name}!`,
          data: { type: 'evolution', stage: newStage },
        },
        trigger: null,
      });
    }
  }

  if (loading || !profile) {
    return <View style={styles.container}><Text style={{ color: '#94a3b8' }}>Loading pet...</Text></View>;
  }

  const stage = getStage(profile.pet_xp);
  const nextXp = getXpToNext(profile.pet_xp);
  const mood = getMood(profile);
  const moodData = MOODS[mood as keyof typeof MOODS] || MOODS.neutral;
  const skin = SKIN_EFFECTS[profile.equipped_skin] || SKIN_EFFECTS.default;

  return (
    <View style={styles.container}>
      <Text style={styles.petName}>{profile.pet_name}</Text>

      <Animated.View style={[styles.petContainer, { transform: [{ translateY: floatAnim }] }]}>
        <Animated.Text style={[styles.petEmoji, { 
          transform: [{ scale: profile.is_premium ? pulseAnim : 1 }],
          textShadowColor: skin.glow,
          textShadowRadius: profile.equipped_skin !== 'default' ? 20 : 0,
        }]}>
          {stage.emoji}
        </Animated.Text>
      </Animated.View>

      <View style={styles.moodBadge}>
        <Text style={[styles.moodText, { color: moodData.color }]}>
          {moodData.icon} {moodData.label}
        </Text>
      </View>

      <Text style={styles.stageName}>{stage.name}</Text>
      <Text style={styles.stageDesc}>{stage.desc}</Text>

      {nextXp && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${nextXp.percent}%` }]} />
          </View>
          <Text style={styles.progressText}>{nextXp.remaining.toLocaleString()} XP to {getStage(profile.pet_xp + nextXp.remaining).name}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile.pet_xp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#ff6b35' }]}>{profile.current_streak} 🔥</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  petName: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  petContainer: { marginVertical: 20 },
  petEmoji: { fontSize: 120 },
  moodBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
  moodText: { fontSize: 14, fontWeight: '600' },
  stageName: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  stageDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  progressContainer: { width: '100%', marginBottom: 24 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 12, alignItems: 'center', minWidth: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
