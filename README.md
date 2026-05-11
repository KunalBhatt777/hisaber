# Centsible (Hisaber)

A React Native expense-splitting app with AI-powered receipt scanning. Create groups, log expenses manually or by photographing a receipt, split costs among friends, and track who owes what — all synced in real-time via Firebase.

---

## Features

### Groups & Expenses
- Create groups and invite friends by username
- Add expenses manually with item name, price, quantity, and tax
- Split expenses across any subset of group members
- Record who paid and how much each person owes
- Log settlements (payments) between members
- "Simplify Debts" mode to collapse circular payment chains

### Receipt Scanning (AI)
- Photograph a receipt or pick one from your gallery
- The backend validates it is a receipt (not a random photo)
- Mistral vision model extracts the store name and line items automatically
- Pre-fills the expense form so you only need to confirm splits

### Tax Support
- Per-group enabled tax rate presets: 2.25%, 3.25%, 10.25%, or custom
- Separate liquor tax fields (state + county) for alcohol purchases

### Friends & Balances
- Send and accept friend requests by username
- See your net balance with each friend across all shared groups
- View the full breakdown of what you owe (or are owed) per group

### Balance Summary & Export
- Group-level balance summary showing who owes whom
- Settle up button to record payments
- Export group expenses as an Excel (.xlsx) file

### Auth
- Email/password sign-up and login
- Google Sign-In
- Push notifications for friend requests and group activity

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.83, Expo 55, TypeScript |
| Navigation | React Navigation v7 (stack + bottom tabs) |
| Auth & Database | Firebase Auth + Cloud Firestore |
| Local Cache | AsyncStorage, expo-sqlite |
| Backend | Python FastAPI + uvicorn |
| AI / LLM | Mistral AI (mistral-small-latest) via LangChain |
| Build & Deploy | EAS Build (Expo), Railway (backend) |

---

## Repository Structure

```
hisaber/
├── src/
│   ├── screens/          # All 11 app screens
│   ├── navigation/       # AppNavigator (auth stack + tab navigator)
│   ├── viewmodels/       # Custom hooks for screen state
│   ├── firebase/         # Firestore CRUD + auth helpers
│   ├── services/         # Backend API calls (receipt scanning)
│   ├── components/       # Shared UI components
│   ├── utils/            # Balance calculator, export, notifications
│   ├── types/            # TypeScript interfaces
│   └── theme/            # Color/styling constants
├── backend/
│   ├── main.py           # FastAPI app entry point
│   ├── routes/           # receipt.py (validate + extract endpoints)
│   ├── models/           # Pydantic request/response models
│   ├── services/         # LLM integration
│   └── .env.example      # Backend environment variables
├── app.config.js         # Expo configuration
└── package.json
```

---

## Setup

### Prerequisites

**All platforms:**
- [Node.js](https://nodejs.org/) 18 or later
- [Python](https://www.python.org/) 3.10 or later
- A Firebase project ([console.firebase.google.com](https://console.firebase.google.com))
- A Mistral AI API key ([console.mistral.ai](https://console.mistral.ai))

**macOS only:**
- Xcode 15+ (for iOS simulator)
- [Homebrew](https://brew.sh) (recommended)

**Android (both platforms):**
- [Android Studio](https://developer.android.com/studio) with an AVD configured

---

### 1. Clone the repo

```bash
git clone https://github.com/your-org/hisaber.git
cd hisaber
```

---

### 2. Frontend setup

#### macOS

```bash
# Install dependencies
npm install

# Install Expo CLI globally (if not already installed)
npm install -g expo-cli
```

#### Windows

Open **PowerShell as Administrator**:

```powershell
# Install dependencies
npm install

# Install Expo CLI globally
npm install -g expo-cli
```

> If you see an execution-policy error on Windows, run:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

#### Configure Firebase

Open [src/firebase/config.ts](src/firebase/config.ts) and replace the `firebaseConfig` object with your own Firebase project credentials:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

You can find these values in the Firebase console under **Project Settings → General → Your apps**.

In the Firebase console, also enable:
- **Authentication → Sign-in method:** Email/Password and Google
- **Firestore Database:** Create a database in production mode

---

### 3. Backend setup

#### macOS

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

#### Windows

```powershell
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env
```

#### Add your Mistral API key

Edit `backend/.env`:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-small-latest
```

#### Start the backend

```bash
# From the backend/ directory with your venv active
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Health check: `http://localhost:8000/health`

#### Point the frontend at your local backend (optional)

By default the app points at the production backend at `https://hisaber-production.up.railway.app`. To use your local backend instead, open [src/services/receiptApi.ts](src/services/receiptApi.ts) and change the base URL to `http://localhost:8000`.

---

### 4. Run the app

Start the Expo dev server from the project root:

```bash
npm start
```

Then press:
- `i` — open in iOS Simulator (macOS only, requires Xcode)
- `a` — open in Android Emulator (requires Android Studio AVD)
- Scan the QR code with the **Expo Go** app on a physical device

---

## Backend API Reference

Base URL: `https://hisaber-production.up.railway.app` (production) or `http://localhost:8000` (local)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/api/receipt/validate` | Check if an image is a receipt |
| POST | `/api/receipt/extract` | Extract store name and line items from a receipt |

### POST `/api/receipt/validate`

```json
// Request
{ "image_base64": "<base64-encoded image>" }

// Response
{ "is_receipt": true }
```

### POST `/api/receipt/extract`

```json
// Request
{ "image_base64": "<base64-encoded image>" }

// Response
{
  "store_name": "Whole Foods",
  "items": [
    { "name": "Organic Milk", "price": 4.99 },
    { "name": "Sourdough Bread", "price": 6.49 }
  ]
}
```

---

## Build for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/). Make sure you have the EAS CLI installed:

```bash
npm install -g eas-cli
eas login
```

| Command | Description |
|---|---|
| `npm run build:android:dev` | Android development build |
| `npm run build:android:preview` | Android preview APK |
| `npm run build:android:prod` | Android production AAB |
| `npm run build:ios:dev` | iOS development build |
| `npm run build:ios:preview` | iOS preview build |
| `npm run build:ios:prod` | iOS production build |

---

## Environment Variables Summary

| Variable | Location | Description |
|---|---|---|
| `MISTRAL_API_KEY` | `backend/.env` | Mistral AI API key for receipt scanning |
| `MISTRAL_MODEL` | `backend/.env` | Model name (default: `mistral-small-latest`) |
| Firebase config | `src/firebase/config.ts` | Firebase project credentials |
