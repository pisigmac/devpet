import { DEMO_USER, initLocalDb, query, run } from './localDb'

const session = {
  user: {
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    app_metadata: {},
    user_metadata: { user_name: DEMO_USER.email.split('@')[0] },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
}

const authChangeListeners = new Set<(_event: string, session: any) => void>()

function makeAuth() {
  return {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session.user }, error: null }),
    onAuthStateChange: (callback: (_event: string, session: any) => void) => {
      authChangeListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => authChangeListeners.delete(callback),
          },
        },
      }
    },
    signInWithOAuth: async () => {
      alert('OAuth is not available in local demo mode.')
      return { data: {}, error: null }
    },
    signOut: async () => {
      authChangeListeners.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    },
  }
}

class LocalQueryBuilder {
  private table: string
  private columns: string = '*'
  private filters: string[] = []
  private params: any[] = []
  private orderBy?: { column: string; ascending: boolean }
  private limitValue?: number
  private singleValue = false

  constructor(table: string) {
    this.table = table
  }

  select(columns: string) {
    this.columns = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push(`${column} = ?`)
    this.params.push(value)
    return this
  }

  or(condition: string) {
    // Supports patterns like: requester_id.eq.<id>,addressee_id.eq.<id>
    const clauses: string[] = []
    const values: string[] = []
    const parts = condition.split(',')
    for (const part of parts) {
      const match = part.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte)\.(.+)$/)
      if (!match) continue
      const [, col, op, val] = match
      const sqlOp = op === 'eq' ? '=' : op === 'neq' ? '!=' : op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : '<='
      clauses.push(`${col} ${sqlOp} ?`)
      values.push(val)
    }
    if (clauses.length > 0) {
      this.filters.push(`(${clauses.join(' OR ')})`)
      this.params.push(...values)
    }
    return this
  }

  order(column: string, { ascending }: { ascending: boolean }) {
    this.orderBy = { column, ascending }
    return this
  }

  limit(n: number) {
    this.limitValue = n
    return this
  }

  single() {
    this.singleValue = true
    return this
  }

  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return this.execute().then(onFulfilled, onRejected)
  }

  async execute() {
    const { rows, foreignMaps, foreignAliases } = this.buildQuery()
    const data = rows.map((row) => this.applySelect(row, foreignMaps, foreignAliases))
    return { data: this.singleValue ? data[0] ?? null : data, error: null }
  }

  private buildQuery() {
    const foreignMaps: Record<string, Record<string, any>> = {}
    const foreignAliases: Record<string, { table: string; column: string }> = {}

    const aliasRegex = /(\w+):(\w+)!(\w+)\(([^)]*)\)/g
    let cleanColumns = this.columns
    let match
    while ((match = aliasRegex.exec(this.columns)) !== null) {
      const [, alias, table, column] = match
      foreignAliases[alias] = { table, column }
      if (!foreignMaps[table]) {
        foreignMaps[table] = {}
        for (const r of query(`SELECT * FROM ${table}`)) {
          foreignMaps[table][r.id] = r
        }
      }
      cleanColumns = cleanColumns.replace(match[0], '')
    }

    let sql = `SELECT * FROM ${this.table}`
    if (this.filters.length > 0) {
      sql += ` WHERE ${this.filters.join(' AND ')}`
    }
    if (this.orderBy) {
      sql += ` ORDER BY ${this.orderBy.column} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`
    }
    if (this.limitValue) {
      sql += ` LIMIT ${this.limitValue}`
    }

    let rows = query(sql, this.params)
    if (this.singleValue) {
      rows = rows.slice(0, 1)
    }

    return { rows, foreignMaps, foreignAliases }
  }

  private applySelect(
    row: any,
    foreignMaps: Record<string, Record<string, any>>,
    foreignAliases: Record<string, { table: string; column: string }>
  ) {
    const result = { ...row }
    for (const [alias, { table, column }] of Object.entries(foreignAliases)) {
      const fk = row[column]
      const map = foreignMaps[table]
      result[alias] = map?.[fk] ?? null
    }
    return result
  }
}

class LocalUpdateBuilder {
  private table: string
  private data: Record<string, any> = {}
  private filters: string[] = []
  private params: any[] = []

  constructor(table: string) {
    this.table = table
  }

  update(data: Record<string, any>) {
    this.data = data
    return this
  }

  eq(column: string, value: any) {
    this.filters.push(`${column} = ?`)
    this.params.push(value)
    return this
  }

  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return this.execute().then(onFulfilled, onRejected)
  }

  async execute() {
    const keys = Object.keys(this.data)
    if (keys.length === 0) return { data: null, error: null }
    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => this.data[k])
    let sql = `UPDATE ${this.table} SET ${setClause}`
    if (this.filters.length > 0) {
      sql += ` WHERE ${this.filters.join(' AND ')}`
    }
    run(sql, [...values, ...this.params])
    return { data: null, error: null }
  }
}

function makeRealtime() {
  return {
    channel: () => ({
      on: function () {
        return this
      },
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    }),
    removeChannel: () => {},
  }
}

async function invokeFunction(name: string, { body }: { body: Record<string, any> }) {
  if (name === 'social-sync') {
    if (body.action === 'invite') {
      const code = 'DEMO' + Math.floor(1000 + Math.random() * 9000)
      return { data: { code }, error: null }
    }
    if (body.action === 'accept') {
      return { data: { success: true }, error: null }
    }
  }
  if (name === 'github-sync') {
    return { data: { synced: true, events_added: 0 }, error: null }
  }
  return { data: null, error: null }
}

export async function createLocalClient() {
  await initLocalDb()

  return {
    auth: makeAuth(),
    channel: makeRealtime().channel,
    removeChannel: makeRealtime().removeChannel,
    from: (table: string) => ({
      select: (columns = '*') => new LocalQueryBuilder(table).select(columns),
      update: (data: Record<string, any>) => new LocalUpdateBuilder(table).update(data),
    }),
    functions: {
      invoke: invokeFunction,
    },
  }
}
