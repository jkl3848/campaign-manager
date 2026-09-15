# Daggerheart Campaign Manager

A web app for running Daggerheart TTRPG campaigns with real-time live sessions, character creation, enemy/NPC builders, and dice rolling.

## Features

- **Character Creator** — Step-by-step wizard driven by editable JSON configs (ancestries, classes, traits, equipment)
- **Character Sheet** — HP, Stress, Hope, traits, abilities, inventory
- **Enemy Builder** — Template-based or fully custom enemies with attacks and abilities
- **NPC Builder** — Create NPCs that can join the party or encounters
- **Encounters** — Build encounters from saved enemies
- **Live Session** — Real-time canvas with drawing tools, map uploads, combat tracking, Hope/Fear
- **Dice Rolling** — 2d12 (white/black) with Hope/Fear gain and crit detection
- **Images** — Auto-compressed uploads (max 1MB)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

In Firebase Console, enable:
- **Authentication** → Email/Password
- **Firestore Database**
- **Storage**
- **Hosting**

Deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules,storage
```

### 3. Run locally

```bash
npm run dev
```

### 4. Deploy

```bash
npm run build
firebase deploy
```

## Usage

### DM
1. Register/login at `/login`
2. Create a campaign from the DM dashboard
3. Share the invite link or code with your player
4. Build enemies, NPCs, and encounters
5. Start a live session when ready to play

### Player
1. Open the invite link from your DM (or go to `/join` and enter the code)
2. Enter your name to join
3. Create one or more characters
4. Join the live session when the DM starts one

## Customizing Game Content

Edit the JSON files in `src/config/daggerheart/`:

| File | Contents |
|------|----------|
| `ancestries.json` | Character ancestries |
| `communities.json` | Character communities |
| `classes.json` | Classes, subclasses, starting stats |
| `traits.json` | The six traits |
| `domains.json` | Domain definitions |
| `equipment.json` | Weapons, armor, items |
| `enemy-templates.json` | Pre-built enemy templates |

Changes take effect after rebuilding/redeploying.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase (Auth, Firestore, Storage, Hosting)
