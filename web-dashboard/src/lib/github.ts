import { supabase, supabaseConfigured } from './supabase'

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
      scopes: 'repo read:user',
    },
  })
  if (error) throw error
  return data
}

export async function syncGitHubData() {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error('Not authenticated')

  const { data, error } = await supabase.functions.invoke('github-sync', {
    body: { user_id: user.data.user.id },
  })

  if (error) throw error
  return data
}

async function getGitHubToken() {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id
  if (!userId) return null

  const { data: tokenRow } = await supabase
    .from('user_tokens')
    .select('github_token')
    .eq('user_id', userId)
    .single()

  return tokenRow?.github_token ?? null
}

const DEMO_GITHUB_PROFILE = {
  login: 'demo_dev',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
  html_url: 'https://github.com/demo_dev',
  name: 'Demo Developer',
  bio: 'Shipping code and growing pets.',
  public_repos: 12,
  followers: 42,
  following: 18,
}

export async function getGitHubProfile() {
  const token = await getGitHubToken()
  if (!token) {
    return supabaseConfigured ? null : DEMO_GITHUB_PROFILE
  }

  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null
  return res.json()
}

export async function getGitHubRepos() {
  const token = await getGitHubToken()
  if (!token) return []

  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  return res.json()
}
