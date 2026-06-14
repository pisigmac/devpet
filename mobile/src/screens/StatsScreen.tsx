import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { getLanguageColor } from '../lib/petEngine';

interface Event { id: string; event_type: string; language: string | null; xp_value: number; created_at: string; }

export default function StatsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [languages, setLanguages] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase
      .from('coding_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setEvents(data || []);

    const langCounts: Record<string, number> = {};
    (data || []).forEach(e => {
      if (e.language) langCounts[e.language] = (langCounts[e.language] || 0) + 1;
    });
    setLanguages(langCounts);
  }

  const totalCommits = events.filter(e => e.event_type === 'commit').length;
  const totalXp = events.reduce((sum, e) => sum + (e.xp_value || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Coding Stats</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalCommits}</Text>
          <Text style={styles.summaryLabel}>Commits</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalXp.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total XP</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{Object.keys(languages).length}</Text>
          <Text style={styles.summaryLabel}>Languages</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Language Breakdown</Text>
      <View style={styles.langContainer}>
        {Object.entries(languages).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
          <View key={lang} style={[styles.langChip, { borderColor: getLanguageColor(lang) }]}>
            <View style={[styles.langDot, { backgroundColor: getLanguageColor(lang) }]} />
            <Text style={styles.langText}>{lang} ({count})</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {events.length === 0 && <Text style={styles.emptyText}>No activity yet. Start coding!</Text>}
      {events.slice(0, 20).map(event => (
        <View key={event.id} style={styles.eventRow}>
          <Text style={styles.eventType}>{event.event_type.replace('_', ' ')}</Text>
          <Text style={styles.eventLang}>{event.language || '—'}</Text>
          <Text style={styles.eventXp}>+{event.xp_value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#f8fafc' },
  summaryLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#f8fafc', marginBottom: 12, marginTop: 8 },
  langContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  langChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, gap: 6 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  langText: { color: '#f8fafc', fontSize: 12 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  eventType: { color: '#f8fafc', fontSize: 14, flex: 1, textTransform: 'capitalize' },
  eventLang: { color: '#94a3b8', fontSize: 12, flex: 1, textAlign: 'center' },
  eventXp: { color: '#22c55e', fontSize: 14, fontWeight: '600', width: 50, textAlign: 'right' },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginVertical: 20 },
});
