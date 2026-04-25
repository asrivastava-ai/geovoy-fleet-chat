# GeoVoy Fleet Ops Chat

Real-time vessel-organised team chat for fleet operations.

## Features
- Message auto-routing to vessel tabs by name detection
- Per-user vessel tab preferences
- Read receipts with initials
- Admin panel: add/remove vessels, invite users
- Single-use invite links with name pre-set
- Firebase Auth + Firestore real-time sync

## Stack
- React + Vite
- Firebase (Auth + Firestore)
- Deployed on Vercel

## Local Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import from GitHub
3. Framework: Vite (auto-detected)
4. No env vars needed (Firebase config is in src/lib/firebase.js)
5. Deploy → assign domain ai-geoserves.com

## First Time Setup

1. Deploy the app
2. Sign in to Firebase Console
3. Go to Authentication → Add user manually (your admin account)
4. Note the UID
5. In Firestore, create `users/{uid}` document:
   ```
   name: "Your Name"
   email: "your@email.com"
   role: "admin"
   initials: "YN"
   setupDone: true
   visibleVessels: []
   ```
6. Sign in to the app with that email/password
7. Use Admin panel to add vessels and invite team members

## Firestore Collections
- `vessels` — fleet vessel list
- `users` — team members and preferences  
- `messages` — all chat messages
- `invites` — single-use invite tokens
