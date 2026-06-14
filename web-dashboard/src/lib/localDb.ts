import initSqlJs from 'sql.js'

let SQL: any
let db: any
let initialized = false

export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@devpet.local',
}

export async function initLocalDb() {
  if (initialized) return
  SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  db = new SQL.Database()
  createSchema()
  seedData()
  initialized = true
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatar_url TEXT,
      pet_name TEXT NOT NULL,
      pet_stage INTEGER NOT NULL DEFAULT 0,
      pet_xp INTEGER NOT NULL DEFAULT 0,
      pet_mood TEXT NOT NULL DEFAULT 'neutral',
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      preferred_theme TEXT NOT NULL DEFAULT 'dark',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coding_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      language TEXT,
      repo_name TEXT,
      file_path TEXT,
      xp_value INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pet_friends (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      addressee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      friend_code TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      github_token TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

function seedData() {
  const now = new Date().toISOString()
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString()

  db.run(
    `INSERT OR IGNORE INTO profiles (id, username, avatar_url, pet_name, pet_stage, pet_xp, pet_mood, current_streak, longest_streak, preferred_theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [DEMO_USER.id, 'demo_dev', null, 'Byte', 2, 340, 'happy', 3, 5, 'dark', now, now]
  )

  const events = [
    { id: 'evt-1', type: 'commit', lang: 'TypeScript', repo: 'devpet/web-dashboard', xp: 25, at: now },
    { id: 'evt-2', type: 'save', lang: 'TypeScript', repo: 'devpet/web-dashboard', xp: 5, at: yesterday },
    { id: 'evt-3', type: 'keystroke', lang: 'CSS', repo: 'devpet/web-dashboard', xp: 1, at: yesterday },
    { id: 'evt-4', type: 'commit', lang: 'Python', repo: 'devpet/xp-engine', xp: 30, at: twoDaysAgo },
    { id: 'evt-5', type: 'language_switch', lang: 'Rust', repo: 'devpet/vscode-extension', xp: 10, at: twoDaysAgo },
  ]

  for (const e of events) {
    db.run(
      `INSERT OR IGNORE INTO coding_events (id, user_id, event_type, language, repo_name, file_path, xp_value, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, DEMO_USER.id, e.type, e.lang, e.repo, null, e.xp, '{}', e.at]
    )
  }

  const friendId = 'demo-friend-1'
  db.run(
    `INSERT OR IGNORE INTO profiles (id, username, avatar_url, pet_name, pet_stage, pet_xp, pet_mood, current_streak, longest_streak, preferred_theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [friendId, 'code_wizard', null, 'Pixel', 3, 890, 'focused', 7, 12, 'dark', now, now]
  )

  db.run(
    `INSERT OR IGNORE INTO pet_friends (id, requester_id, addressee_id, status, friend_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['fr-1', DEMO_USER.id, friendId, 'accepted', 'BYTE42', now]
  )
}

export function run(sql: string, params?: any[]) {
  ensureReady()
  return db.run(sql, params)
}

export function query(sql: string, params?: any[]): any[] {
  ensureReady()
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params || [])
    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function querySingle(sql: string, params?: any[]): any | null {
  const rows = query(sql, params)
  return rows[0] || null
}

function ensureReady() {
  if (!initialized) {
    throw new Error('Local DB not initialized. Call initLocalDb() first.')
  }
}
