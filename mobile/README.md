# DevPet Mobile — React Native Companion

## Setup
```bash
cd mobile
npm install
```

## Configure
Edit `app.json` → `extra` section with your Supabase credentials:
```json
"extra": {
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-anon-key"
}
```

## Run
```bash
npx expo start
```
Scan QR code with **Expo Go** app, or press `i`/`a` for simulator.

## Build (Production)
```bash
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android

# Or configure EAS for OTA updates
npx eas update --auto
```

## Features
- 🎨 Animated pet with Reanimated + Lottie
- 🔔 Push notifications on evolution
- 📴 Offline mode with AsyncStorage
- 🔄 Real-time sync with Supabase
- 💳 In-app Stripe purchases
- 🌐 Social hub + leaderboard
