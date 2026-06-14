#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const program = new Command()

program.name('devpet-deploy').description('One-command deployment for DevPet ecosystem').version('1.0.0')

program.command('init').description('Interactive setup — collects all credentials').action(async () => {
  console.log(chalk.cyan.bold('
🐛 DevPet Deployment Orchestrator
'))
  const answers = await inquirer.prompt([
    { type: 'input', name: 'supabaseUrl', message: 'Supabase Project URL:', validate: (v) => v.includes('supabase.co') || 'Must be a valid Supabase URL' },
    { type: 'password', name: 'supabaseKey', message: 'Supabase Service Role Key:', mask: '*' },
    { type: 'input', name: 'githubClientId', message: 'GitHub OAuth Client ID:' },
    { type: 'password', name: 'githubSecret', message: 'GitHub OAuth Client Secret:', mask: '*' },
    { type: 'input', name: 'stripeSecret', message: 'Stripe Secret Key (sk_test_...):', default: '' },
    { type: 'input', name: 'stripeWebhook', message: 'Stripe Webhook Secret (whsec_...):', default: '' },
    { type: 'input', name: 'razorpayKeyId', message: 'Razorpay Key ID (rzp_test_...):', default: '' },
    { type: 'password', name: 'razorpaySecret', message: 'Razorpay Key Secret:', mask: '*', default: '' },
    { type: 'input', name: 'razorpayWebhook', message: 'Razorpay Webhook Secret:', default: '' },
    { type: 'input', name: 'cloudflareAccount', message: 'Cloudflare Account ID:', default: '' },
    { type: 'password', name: 'cloudflareToken', message: 'Cloudflare API Token:', mask: '*', default: '' },
    { type: 'input', name: 'domain', message: 'Custom domain (e.g., devpet.app):', default: '' },
    { type: 'input', name: 'vsceToken', message: 'VS Code Marketplace PAT (optional):', default: '' },
  ])
  const envContent = Object.entries(answers).map(([k, v]) => `${k.toUpperCase().replace(/([A-Z])/g, '_$1').toUpperCase()}=${v}`).join('
')
  await fs.writeFile(path.join(process.cwd(), '.env'), envContent)
  console.log(chalk.green('✓ .env file created with all credentials'))
})

program.command('backend').description('Deploy Supabase schema + edge functions').action(async () => {
  const spinner = ora('Deploying Supabase backend...').start()
  try {
    await execa('supabase', ['--version'])
    spinner.text = 'Linking Supabase project...'
    await execa('supabase', ['link', '--project-ref', process.env.SUPABASE_URL!.split('.')[0].replace('https://', '')])
    spinner.text = 'Pushing database schema...'
    await execa('supabase', ['db', 'push'])
    spinner.text = 'Deploying edge functions...'
    const functions = ['xp-engine', 'github-sync', 'social-sync', 'stripe-webhook', 'create-checkout-session', 'razorpay-create-order', 'razorpay-webhook']
    for (const fn of functions) { spinner.text = `Deploying ${fn}...`; await execa('supabase', ['functions', 'deploy', fn, '--no-verify-jwt']) }
    spinner.text = 'Setting edge function secrets...'
    const secrets = [
      `SUPABASE_URL=${process.env.SUPABASE_URL}`, `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_KEY}`,
      `GITHUB_CLIENT_ID=${process.env.GITHUB_CLIENT_ID}`, `GITHUB_CLIENT_SECRET=${process.env.GITHUB_SECRET}`,
      `STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET || ''}`, `STRIPE_WEBHOOK_SECRET=${process.env.STRIPE_WEBHOOK || ''}`,
      `RAZORPAY_KEY_ID=${process.env.RAZORPAY_KEY_ID || ''}`, `RAZORPAY_KEY_SECRET=${process.env.RAZORPAY_SECRET || ''}`,
      `RAZORPAY_WEBHOOK_SECRET=${process.env.RAZORPAY_WEBHOOK || ''}`,
    ].filter(s => !s.endsWith('='))
    for (const secret of secrets) { await execa('supabase', ['secrets', 'set', secret]) }
    spinner.succeed('Supabase backend deployed successfully')
  } catch (err: any) { spinner.fail(`Backend deployment failed: ${err.message}`); process.exit(1) }
})

program.command('web').description('Build and deploy web dashboard + landing page').action(async () => {
  const spinner = ora('Deploying web assets...').start()
  try {
    const webDir = path.join(process.cwd(), '..', 'web-dashboard')
    spinner.text = 'Building web dashboard...'
    await execa('npm', ['run', 'build'], { cwd: webDir })
    spinner.text = 'Copying landing page...'
    await fs.copy(path.join(process.cwd(), '..', 'landing-page', 'index.html'), path.join(webDir, 'dist', 'index.html'))
    spinner.text = 'Deploying to Cloudflare Pages...'
    const deployArgs = ['pages', 'deploy', 'dist', '--project-name=devpet-dashboard']
    if (process.env.CLOUDFLARE_ACCOUNT) deployArgs.push(`--account-id=${process.env.CLOUDFLARE_ACCOUNT}`)
    await execa('wrangler', deployArgs, { cwd: webDir })
    spinner.succeed('Web dashboard + landing page deployed')
  } catch (err: any) { spinner.fail(`Web deployment failed: ${err.message}`); process.exit(1) }
})

program.command('vscode').description('Package and publish VS Code extension').action(async () => {
  const spinner = ora('Packaging VS Code extension...').start()
  try {
    const extDir = path.join(process.cwd(), '..', 'vscode-extension')
    await execa('npm', ['run', 'compile'], { cwd: extDir })
    await execa('vsce', ['package'], { cwd: extDir })
    spinner.succeed('VS Code extension packaged')
    if (process.env.VSCE_TOKEN) {
      spinner.start('Publishing to VS Code Marketplace...')
      await execa('vsce', ['publish', '-p', process.env.VSCE_TOKEN], { cwd: extDir })
      spinner.succeed('Published to VS Code Marketplace!')
    } else {
      console.log(chalk.yellow('
ℹ No VSCE_TOKEN found. Install locally with:'))
      console.log(chalk.cyan(`  code --install-extension ${path.join(extDir, 'devpet-1.0.0.vsix')}`))
    }
  } catch (err: any) { spinner.fail(`Extension deployment failed: ${err.message}`); process.exit(1) }
})

program.command('mobile').description('Build mobile app with EAS').action(async () => {
  const spinner = ora('Building mobile app...').start()
  try {
    const mobileDir = path.join(process.cwd(), '..', 'mobile')
    spinner.text = 'Running EAS build...'
    await execa('npx', ['eas', 'build', '--platform', 'all', '--profile', 'production', '--non-interactive'], { cwd: mobileDir })
    spinner.succeed('Mobile builds queued on EAS. Check expo.dev for status.')
  } catch (err: any) { spinner.fail(`Mobile build failed: ${err.message}`); process.exit(1) }
})

program.command('landing').description('Deploy marketing landing page only').action(async () => {
  const spinner = ora('Deploying landing page...').start()
  try {
    const landingDir = path.join(process.cwd(), '..', 'landing-page')
    const deployArgs = ['pages', 'deploy', '.', '--project-name=devpet-landing']
    if (process.env.CLOUDFLARE_ACCOUNT) deployArgs.push(`--account-id=${process.env.CLOUDFLARE_ACCOUNT}`)
    await execa('wrangler', deployArgs, { cwd: landingDir })
    spinner.succeed('Landing page deployed')
  } catch (err: any) { spinner.fail(`Landing deployment failed: ${err.message}`); process.exit(1) }
})

program.command('all').description('Full deployment: backend + web + vscode + mobile').action(async () => {
  console.log(chalk.cyan.bold('
🚀 DevPet Full Deployment
'))
  const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_SECRET']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) { console.log(chalk.red(`Missing env vars: ${missing.join(', ')}. Run: devpet-deploy init`)); process.exit(1) }
  await program.parseAsync(['node', 'deploy', 'backend'])
  await program.parseAsync(['node', 'deploy', 'web'])
  await program.parseAsync(['node', 'deploy', 'vscode'])
  await program.parseAsync(['node', 'deploy', 'mobile'])
  console.log(chalk.green.bold('
✅ DevPet fully deployed!'))
  console.log(chalk.cyan(`  Dashboard:  https://devpet-dashboard.pages.dev`))
  console.log(chalk.cyan(`  Landing:    https://devpet-landing.pages.dev`))
  console.log(chalk.cyan(`  Supabase:   ${process.env.SUPABASE_URL}`))
  console.log(chalk.cyan(`  VS Code:    Install devpet-1.0.0.vsix`))
  console.log(chalk.cyan(`  Mobile:     Check expo.dev builds`))
})

program.parse()
