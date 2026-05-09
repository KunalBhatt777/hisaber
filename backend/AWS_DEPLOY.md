# AWS App Runner Deployment Guide

## Prerequisites
- AWS account fully activated (credit card verified, identity confirmed)
- $90 credit applied under Billing → Credits
- Backend `Dockerfile` and `.dockerignore` already present in this folder

## Step 1 — Push code to GitHub
Make sure the `backend/` folder including `Dockerfile` is pushed.
The `.env` file is gitignored — your API key stays local.

## Step 2 — Open App Runner
1. Log into console.aws.amazon.com
2. Search **App Runner** → click **Create service**

## Step 3 — Connect GitHub
1. Source → **Source code repository**
2. Click **Add new** → grant GitHub App permissions (one-time)
3. Select your repo and branch (`main` or `AI_Scan`)
4. Source directory → `backend`

## Step 4 — Build config
- Deployment trigger → **Automatic** (redeploys on every push)
- Configuration → **Configure all settings here**
- Runtime → **Docker** (auto-detects the Dockerfile)
- Port → `8080`

## Step 5 — Environment variable
| Key | Value |
|-----|-------|
| `MISTRAL_API_KEY` | your key from backend/.env |

## Step 6 — Instance size (cheapest)
- CPU → 0.25 vCPU
- Memory → 0.5 GB
- Cost → ~$5/month (well within $90 credit)

## Step 7 — Deploy
Click **Create & deploy**. First build takes ~3-5 min.
Test the live URL:
```
GET https://xxxxxxxxxx.us-east-1.awsapprunner.com/health
→ {"status":"ok"}
```

## Step 8 — Update the app
In `src/services/receiptApi.ts`:
```typescript
const BASE_URL = 'https://xxxxxxxxxx.us-east-1.awsapprunner.com';
```

## Future deploys
Just `git push` — App Runner rebuilds and redeploys automatically.
