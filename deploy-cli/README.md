# DevPet Deploy CLI

## Installation
```bash
cd deploy-cli
npm install
npm run build
```

## Commands

### Interactive Setup
```bash
node dist/index.js init
```
Collects all credentials (Supabase, GitHub, Stripe, Cloudflare, VSCE) and writes `.env`.

### Deploy Backend Only
```bash
node dist/index.js backend
```
- Links Supabase project
- Pushes database schema
- Deploys all edge functions (xp-engine, github-sync, social-sync, stripe-webhook)
- Sets environment secrets

### Deploy Web Dashboard
```bash
node dist/index.js web
```
- Builds Vite production bundle
- Deploys to Cloudflare Pages via Wrangler

### Package VS Code Extension
```bash
node dist/index.js vscode
```
- Compiles TypeScript
- Creates `.vsix` package
- Publishes to marketplace if `VSCE_TOKEN` is set

### Full Deployment (One Command)
```bash
node dist/index.js all
```
Runs backend → web → vscode in sequence with progress spinners.

## Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- Node.js 18+
