# 🏦 Mono Bank Integration — Setup Guide

This guide walks you through configuring and deploying the Mono bank integration for SpendWise.

---

## Prerequisites

- A [Mono](https://app.withmono.com) account (free to sign up)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (for edge function deployment)
- Your Supabase project already running

---

## Step 1: Get Your Mono API Keys

1. Go to [app.withmono.com/apps](https://app.withmono.com/apps)
2. Create a new app (or select your existing one)
3. Copy your **Public Key** and **Secret Key** from the dashboard

---

## Step 2: Set the Frontend Public Key

Update your `.env` file in the project root:

```env
EXPO_PUBLIC_MONO_PUBLIC_KEY=live_pk_xxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ Use your **test key** (`test_pk_...`) during development, and your **live key** (`live_pk_...`) for production.

---

## Step 3: Set Supabase Edge Function Secrets

The edge functions need your Mono **Secret Key**. Set it via the Supabase CLI:

```bash
supabase secrets set MONO_SECRET_KEY=live_sk_xxxxxxxxxxxxxxxxxxxxxxxx
```

Or set it in the Supabase Dashboard:
1. Go to **Edge Functions** → **Secrets**
2. Add `MONO_SECRET_KEY` with your secret key value

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to edge functions — no need to set those.

---

## Step 4: Run the Database Migration

In your Supabase Dashboard:

1. Go to **SQL Editor** → **New Query**
2. Paste the contents of `supabase/migrations/create_linked_accounts.sql`
3. Click **Run**

This creates:
- `linked_accounts` table
- Row Level Security policies
- Indexes for performance
- Renames any legacy `plaid_transaction_id` column to `bank_transaction_id`

---

## Step 5: Deploy Edge Functions

From your project root, deploy both functions:

```bash
supabase functions deploy exchange-mono-token
supabase functions deploy sync-mono-transactions
```

If you haven't linked your project yet:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref can be found in the Supabase Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.

---

## Step 6: Test the Integration

1. Run the app on a **mobile device** (Mono Connect widget is native-only):
   ```bash
   npm run android
   # or
   npm run ios
   ```
2. Navigate to the **More** tab → **Bank Accounts** section
3. Tap **Link Bank Account** → complete the Mono Connect flow
4. After linking, tap **↻ Sync** to import transactions
5. Go to the **Transactions** tab and use the **"🏦 Bank"** filter to see imported transactions

> 💡 On web, the Link Bank Account button shows "Available on mobile devices only" since the Mono Connect widget requires a native WebView.

---

## Architecture Overview

```
┌──────────────────┐     Mono Connect      ┌────────────────┐
│  Mobile App      │ ────── code ────────▶ │  Mono API      │
│  (React Native)  │                       │  (withmono.com)│
└────────┬─────────┘                       └────────┬───────┘
         │ code                                     │
         ▼                                          │
┌──────────────────────┐   exchange               │
│  exchange-mono-token │ ◄──── account ID ─────────┘
│  (Edge Function)     │
│  Saves linked_account│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────┐    fetch transactions
│  sync-mono-transactions  │ ◄──────────────────────┐
│  (Edge Function)         │                        │
│  Deduplicates + imports  │ ──── transactions ────▶│ Mono API
│  Auto-categorizes        │                        │
└──────────────────────────┘                        └─────────
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Mono SDK not available" on native | Run `npm install @mono.co/connect-react-native react-native-webview` |
| "Mono secret key not configured" | Set `MONO_SECRET_KEY` in Supabase Edge Function secrets |
| Link button disabled on web | Expected — Mono Connect is native-only |
| "Failed to authenticate with Mono" | Check that your Mono public/secret keys match (both test or both live) |
| Duplicate transactions | The sync function deduplicates by `bank_transaction_id` — this shouldn't happen |
