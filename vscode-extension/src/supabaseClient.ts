import { createClient, SupabaseClient as SBClient } from '@supabase/supabase-js';

export class SupabaseClient {
  private client: SBClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
  }

  async getUser() {
    const { data } = await this.client.auth.getUser();
    return data.user;
  }

  async getProfile(userId: string) {
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  async insertEvents(events: any[]) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const enriched = events.map(e => ({
      ...e,
      user_id: user.id,
    }));

    const { error } = await this.client.from('coding_events').insert(enriched);
    if (error) throw error;

    // Also trigger XP engine
    for (const event of enriched) {
      await this.client.functions.invoke('xp-engine', { body: { event } });
    }
  }
}
