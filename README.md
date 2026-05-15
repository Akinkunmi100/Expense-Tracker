# 💸 SpendWise — Dual-Mode Tracker & Planner

A cross-platform finance application (Web + Android + iOS) built with **Expo**, **React Native**, and **Supabase**. Designed as a **Dual-Mode** app: it seamlessly functions as a Personal Expense Tracker or a Professional Business/Vendor Ledger.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎭 **Dual-Mode Architecture** | Switch instantly between **Personal Mode** and **Business Mode** (with distinct dashboards, KPIs, and flows). |
| ✨ **Premium Aesthetics** | OLED True Dark mode with glassmorphism, glowing accents, and high-contrast typography. |
| 🔐 Authentication | Email/password + Google OAuth via Supabase Auth |
| 📊 Dashboard | Dynamic KPIs: Net Profit & Health Score (Business) or Spend & Budgets (Personal). |
| 📥 Invoicing (Pro) | Generate, manage, and download PDF invoices for clients. |
| 📦 Inventory (Pro) | Track product stocks, margins, and low-stock alerts. |
| ➕ Smart Input | Intelligent auto-categorization and multi-channel sales logging (WhatsApp, IG, Store). |
| 📋 Transactions | Filterable list with tax (VAT/WHT) handling and bulk Archiving/Restore capabilities. |
| 🎯 Goals & Budgets | Create savings goals and track monthly budgets with colour-coded progress bars. |
| 👤 Smooth UX Onboarding | Dedicated welcome flow intercepting new users to configure their experience upfront. |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Expo](https://expo.dev) (SDK 55) with Expo Router (file-based navigation) |
| **Language** | TypeScript (strict mode) |
| **UI** | React Native (cross-platform — Web, Android, iOS) |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **Backend & Auth** | [Supabase](https://supabase.com) (PostgreSQL + Auth + Row Level Security) |
| **Session Storage** | `@react-native-async-storage/async-storage` |

---

## 📁 Project Structure

```
expense-tracker/
├── app/
│   ├── _layout.tsx              ← Root layout (auth guard + onboarding routing)
│   ├── onboarding.tsx           ← First-time mode selection (Personal / Business)
│   ├── archived.tsx             ← Archived transactions viewer
│   ├── inventory.tsx            ← Product catalog & stock management
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Auth stack navigator
│   │   ├── login.tsx            ← Login / Sign Up screen
│   │   └── profile-setup.tsx    ← Onboarding: name, currency, income type
│   └── (tabs)/
│       ├── _layout.tsx          ← Bottom tab navigator (mode-aware)
│       ├── index.tsx            ← Dashboard (Personal or Business P&L)
│       ├── transactions.tsx     ← Transaction list with Clear Data modal
│       ├── add.tsx              ← Add expense / Record Sale
│       ├── budgets.tsx          ← Budget manager (Personal mode)
│       ├── invoices.tsx         ← Invoice manager (Business mode)
│       ├── customers.tsx        ← Customer ledger (Business mode)
│       ├── analytics.tsx        ← Analytics with tax summaries
│       └── more.tsx             ← Goals, profile, settings & data management
├── components/
│   ├── TransactionCard.tsx      ← Reusable transaction row component
│   ├── MonoConnectButton.tsx    ← Bank linking widget
│   └── SkeletonLoader.tsx       ← Loading placeholder component
├── constants/
│   ├── Colors.ts                ← Premium OLED dark design tokens
│   ├── Categories.ts            ← Personal category list, icons & keyword map
│   └── BusinessCategories.ts    ← Business category list & icons
├── hooks/
│   ├── useFilteredTransactions.ts ← Date/source transaction filtering
│   └── useCustomerLedger.ts     ← Customer-based transaction grouping
├── lib/
│   └── supabase.ts              ← Supabase client configuration
├── store/
│   ├── authStore.ts             ← Auth state (session + profile)
│   ├── transactionStore.ts      ← Transactions (CRUD + archive/restore)
│   ├── budgetStore.ts           ← Budgets (CRUD)
│   ├── goalStore.ts             ← Goals + contributions
│   ├── invoiceStore.ts          ← Invoices (CRUD + status workflow)
│   ├── productStore.ts          ← Inventory / Products (CRUD)
│   ├── monoStore.ts             ← Bank account linking & sync
│   └── receivableStore.ts       ← Accounts receivable
├── types/
│   └── index.ts                 ← Shared TypeScript interfaces
├── utils/
│   ├── categorize.ts            ← Auto-categorization, currency formatter
│   └── analytics.ts             ← Period-based analytics helpers
├── supabase/
│   ├── migrations/              ← All database migration SQL files
│   └── functions/               ← Edge Functions (Mono token exchange, sync)
├── .env                         ← API credentials (not committed)
├── app.json                     ← Expo config
├── index.ts                     ← Expo Router entry point
└── tsconfig.json                ← TypeScript config
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Expo Go](https://expo.dev/go) app on your phone (optional, for device testing)
- A free [Supabase](https://supabase.com) account

### 1. Clone & Install

```bash
git clone https://github.com/Akinkunmi100/Expense-Tracker.git
cd Expense-Tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the Supabase dashboard, go to **SQL Editor** → **New Query**
3. Paste and run the full schema SQL from [Database Schema](#-database-schema) below
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**

### 3. Configure Environment Variables

Create a `.env` file in the project root with **all** required keys:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_MONO_PUBLIC_KEY=your-mono-public-key-here
```

> **Where to find these:**
> - **Supabase keys**: [Supabase Dashboard](https://supabase.com) → Project Settings → API
> - **Mono key**: [Mono Dashboard](https://app.withmono.com) → API Keys (optional — only needed for bank linking)

---

### 🔐 Project Credentials Recovery

> [!IMPORTANT]
> **The Supabase account for this project is registered with a Google/email account.**
> If you forget which email you used, try the following:

**Step 1 — Check your email inbox** for a message from `noreply@supabase.io` with subject "Confirm your email" or "Welcome to Supabase". This was sent when the account was first created.

**Step 2 — Try signing in at [supabase.com](https://supabase.com)** with Google OAuth (the "Continue with Google" button). If the project was created via Google, this will log you in directly without needing a password or email.

**Step 3 — If you still can't access it**, create a brand-new free Supabase project:
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Run the full SQL schema from the [Database Schema](#-database-schema) section below in the SQL Editor
3. Copy your new **Project URL** and **anon key** into your `.env` file
4. ⚠️ Note: existing user data from the old project will NOT transfer — only app code is needed

---

### 4. Run the App

```bash
# Start in interactive mode (choose web/Android/iOS)
npm start

# Open directly in web browser
npm run web

# Open on Android
npm run android

# Open on iOS
npm run ios
```

> Scan the QR code in the terminal with the **Expo Go** app, or press `w` to open in your web browser.

---

## 🗄 Database Schema

Run this SQL in the **Supabase SQL Editor** to create all tables, Row Level Security policies, and the auto-profile trigger:

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  income_type TEXT CHECK (income_type IN ('salary','freelance','pension','allowance','other')),
  currency TEXT DEFAULT 'NGN',
  monthly_income NUMERIC(12,2),
  display_mode TEXT DEFAULT 'detailed' CHECK (display_mode IN ('simple','detailed')),
  app_mode TEXT DEFAULT 'personal' CHECK (app_mode IN ('personal','business')),
  has_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  transaction_mode TEXT DEFAULT 'personal' CHECK (transaction_mode IN ('personal','business')),
  sales_channel TEXT,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_type TEXT CHECK (tax_type IN ('VAT', 'WHT')),
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Goal contributions
CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE
);

-- Invoices (Business Mode)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  due_date DATE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Paid','Overdue')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice line items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products / Inventory (Business Mode)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  stock_qty INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Linked Bank Accounts (Mono integration)
CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mono_account_id TEXT NOT NULL,
  institution_name TEXT,
  account_name TEXT,
  account_type TEXT,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Receivables (Business Mode)
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  matched_transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- RLS Policies (each user can only access their own data)
CREATE POLICY "Own profile" ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Own transactions" ON transactions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own budgets" ON budgets USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals" ON goals USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own contributions" ON goal_contributions USING (
  EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_contributions.goal_id AND goals.user_id = auth.uid())
);
CREATE POLICY "Own invoices" ON invoices USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own invoice items" ON invoice_items USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Own products" ON products USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own linked accounts" ON linked_accounts USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own receivables" ON receivables USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 🔑 Key Design Decisions

- **OLED True Dark Mode** — Premium UI built on pure black (`#000`) with electric indigo, emerald, and amber accents.
- **Dual-Mode Architecture** — A single codebase that dynamically adjusts dashboards, categories, KPIs, and tab labels based on Personal vs Business mode.
- **Nigerian Market Focus** — Default currency is NGN (₦), and the auto-categorizer includes 150+ Nigerian merchant keywords (Bolt, Opay, DSTV, Mama Put, etc.).
- **Offline-first architecture** — Zustand stores keep data in memory; the UX is fast even on slow connections.
- **Auth Guard + Onboarding** — The root layout enforces a sequential flow: Login → Profile Setup → Mode Selection → Dashboard. Users can't skip any step.
- **Rule-based Categorization** — Transactions are auto-categorized by matching the description against a keyword map before the user even has to choose.
- **Soft-Delete Archiving** — Data management uses `is_archived` flags so users never lose data accidentally.

---

## 📍 Roadmap

- [x] Phase 1 — Core: Auth, Dashboard, Transactions, Budgets, Goals
- [x] Phase 2 — Invoicing & Inventory (Business Mode)
- [x] Phase 3 — Advanced Vendor Features: Sales Channels, Tax Reporting, Business Health Score
- [x] Phase 4 — Data Management: Bulk Archive/Delete, Archived Data Recovery
- [x] Phase 5 — Premium UI Redesign & Onboarding Flow
- [ ] Phase 6 — Smart Reminders, Routine Expenses & Voice-to-Expense Logging

---

## 📄 License

MIT © Taofeek
