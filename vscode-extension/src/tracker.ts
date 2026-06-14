import { SupabaseClient } from './supabaseClient';

interface QueuedEvent {
  event_type: string;
  language?: string;
  file_path?: string;
  xp_value?: number;
  metadata?: Record<string, unknown>;
}

export class PetTracker {
  private supabase: SupabaseClient;
  private eventQueue: QueuedEvent[] = [];
  private keystrokeCount = 0;
  private sessionStart: number = Date.now();
  private lastSave = 0;
  private xp = 0;
  private streak = 0;
  private mood = 'neutral';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.loadState();
  }

  async loadState() {
    const user = await this.supabase.getUser();
    if (!user) return;
    const profile = await this.supabase.getProfile(user.id);
    if (profile) {
      this.xp = profile.pet_xp || 0;
      this.streak = profile.current_streak || 0;
      this.mood = profile.pet_mood || 'neutral';
    }
  }

  logKeystroke() {
    this.keystrokeCount++;
    if (this.keystrokeCount % 50 === 0) {
      this.queueEvent('keystroke');
    }
  }

  logEvent(type: string, language?: string, metadata?: Record<string, unknown>) {
    this.queueEvent(type, language, undefined, undefined, metadata);

    if (type === 'commit') {
      this.mood = 'excited';
    } else if (type === 'save') {
      this.mood = 'focused';
    }
  }

  startSession() {
    this.sessionStart = Date.now();
    this.queueEvent('session_start');
  }

  endSession() {
    const duration = Math.floor((Date.now() - this.sessionStart) / 60000);
    this.queueEvent('session_end', undefined, undefined, undefined, { duration_minutes: duration });
    this.flushEvents();
  }

  private queueEvent(
    type: string,
    language?: string,
    filePath?: string,
    xp?: number,
    metadata?: Record<string, unknown>
  ) {
    const editor = (global as any).vscode?.window?.activeTextEditor;
    this.eventQueue.push({
      event_type: type,
      language: language || editor?.document?.languageId,
      file_path: filePath || editor?.document?.fileName,
      xp_value: xp,
      metadata,
    });

    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  async flushEvents() {
    if (this.eventQueue.length === 0) return;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.supabase.insertEvents(events);
    } catch (err) {
      console.error('DevPet: Failed to sync events', err);
      this.eventQueue.unshift(...events);
    }
  }

  getMood() { return this.mood; }
  getXp() { return this.xp; }
  getStreak() { return this.streak; }
}
