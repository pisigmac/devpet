# 🐛 DevPet — Your Coding Companion

A full-stack digital pet ecosystem that grows based on your real coding habits.

**Includes:** VS Code extension • Web dashboard • Mobile app (React Native) • Supabase backend • GitHub integration • Stripe billing • Razorpay billing • Social features • One-command deployment • Marketing landing page

---

## 📁 Project Structure

```
devpet/
├── architecture.md              # System architecture & data flow
│
├── deploy-cli/                  # One-command deployment orchestrator
│   ├── src/index.ts             # CLI: backend + web + vscode + mobile + landing
│   ├── package.json
│   └── README.md
│
├── supabase/
│   ├── schema.sql               # Core database schema + RLS policies
│   ├── stripe/
│   │   └── schema_additions.sql # Products, prices, subscriptions, inventory
│   ├── razorpay/
│   │   └── schema_additions.sql # Razorpay orders, payments, webhooks
│   └── functions/
│       ├── xp-engine/           # XP calculation & evolution logic
│       ├── github-sync/         # GitHub API integration
│       ├── social-sync/         # Friends & leaderboard
│       ├── stripe-webhook/      # Stripe webhook handler
│       ├── create-checkout-session/ # Stripe Checkout creation
│       ├── razorpay-create-order/   # Razorpay order creation
│       └── razorpay-webhook/      # Razorpay webhook handler
│
├── vscode-extension/
│   ├── package.json             # Extension manifest
│   ├── tsconfig.json
│   └── src/
│       ├── extension.ts         # Main activation & commands
│       ├── tracker.ts           # Activity tracking engine
│       ├── supabaseClient.ts
│       └── petPanel.ts          # Webview dashboard panel
│
├── web-dashboard/
│   ├── package.json             # Vite + React + TypeScript
│   ├── vite.config.ts
│   ├── wrangler.toml            # Cloudflare Pages deploy config
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles.css           # Cyberpunk glassmorphism theme
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── github.ts        # GitHub OAuth helpers
│       │   └── petEngine.ts     # Stage/mood/color logic
│       └── components/
│           ├── Auth.tsx
│           ├── Dashboard.tsx
│           ├── SocialHub.tsx
│           ├── Shop.tsx           # Stripe + Razorpay marketplace
│           ├── PremiumGate.tsx    # Premium feature gating
│           └── Settings.tsx
│
├── mobile/                      # React Native (Expo) companion
│   ├── package.json             # Expo SDK 50 + Reanimated + Lottie
│   ├── app.json                 # iOS/Android config
│   ├── eas.json                 # EAS build profiles
│   ├── EAS_BUILD.md             # Store submission guide
│   ├── App.tsx                  # Navigation + auth gate
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts      # RN-compatible Supabase client
│       │   └── petEngine.ts     # Shared pet logic
│       └── screens/
│           ├── AuthScreen.tsx
│           ├── PetScreen.tsx    # Animated pet with push notifications
│           ├── StatsScreen.tsx  # Language breakdown + activity feed
│           ├── SocialScreen.tsx # Friends + leaderboard
│           └── ShopScreen.tsx   # In-app Stripe + Razorpay purchases
│
└── landing-page/
    ├── index.html               # Marketing landing page (single file)
```

---

## 🚀 Quick Start

### Option A: One-Command Deploy (Recommended)
```bash
cd deploy-cli
npm install && npm run build
node dist/index.js init       # Interactive credential setup
node dist/index.js all        # Deploy everything
```

### Option B: Manual Deployment

**1. Supabase Backend**
```bash
# Create project at supabase.com
# Run schema.sql + stripe/schema_additions.sql + razorpay/schema_additions.sql
supabase functions deploy xp-engine
supabase functions deploy github-sync
supabase functions deploy social-sync
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-webhook
# Set secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, RAZORPAY_KEY_ID, etc.
```

**2. Web Dashboard + Landing Page**
```bash
cd web-dashboard
npm install
npm run build
# Landing page auto-copied during deploy
cd ../landing-page
wrangler pages deploy . --project-name=devpet-landing
```

**3. VS Code Extension**
```bash
cd vscode-extension
npm install && npm run compile
vsce package
```

**4. Mobile App**
```bash
cd mobile
npm install
npx expo start
# Or build for stores:
npx eas build --platform all --profile production
```

---

## 💳 Payment Providers

| Provider | Region | Methods | Use Case |
|---|---|---|---|
| **Stripe** | Global | Cards, PayPal, Apple Pay, Google Pay | US, EU, international |
| **Razorpay** | India | UPI, NetBanking, Cards, Wallets | Indian users |

Users can switch providers in settings. Products are priced in both USD and INR.

### Pre-seeded Products
| Product | Stripe | Razorpay | Type |
|---|---|---|---|
| Neon Circuit Skin | $4.99 | ₹415 | One-time |
| Golden Hacker Skin | $9.99 | ₹830 | One-time |
| Fire Streak Badge | $2.99 | ₹248 | One-time |
| **DevPet Pro** | $7.99/mo | ₹660/mo | Subscription |

---

## 📱 Mobile Features

- **Animated pet** with Lottie + Reanimated
- **Push notifications** on evolution events
- **Offline mode** — AsyncStorage caches pet state
- **Real-time sync** — Supabase Realtime across devices
- **In-app purchases** — Stripe Checkout + Razorpay via WebView
- **Social hub** — Friends, leaderboards, pet comparisons
- **Store ready** — EAS build profiles for App Store & Play Store

---

## 📊 Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | Vite + React + TypeScript + Framer Motion |
| Mobile | Expo + React Native + Reanimated + Lottie |
| Backend | Supabase (Postgres + Edge Functions + Realtime) |
| Extension | VS Code API + TypeScript |
| Payments | Stripe Checkout + Razorpay |
| Hosting | Cloudflare Pages (web + landing) |
| Deploy | Custom Node.js CLI (Commander + Inquirer) |
| CI/CD | EAS (mobile) + Wrangler (web) |

---

## 🔐 Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# VS Code Marketplace
VSCE_TOKEN=
```

---

## 📝 License

Apache 2.0
