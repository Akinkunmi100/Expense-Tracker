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
│   ├── _layout.tsx              ← Root layout (auth guard + routing)
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Auth stack navigator
│   │   ├── login.tsx            ← Login / Sign Up screen
│   │   └── profile-setup.tsx    ← Onboarding: name, currency, income type
│   └── (tabs)/
│       ├── _layout.tsx          ← Bottom tab navigator (5 tabs)
│       ├── index.tsx            ← Dashboard
│       ├── transactions.tsx     ← Transaction list
│       ├── add.tsx              ← Add expense
│       ├── budgets.tsx          ← Budget manager
│       └── more.tsx             ← Goals, profile & settings
├── constants/
│   ├── Colors.ts                ← Design system colour tokens
│   └── Categories.ts            ← Category list, icons & keyword map
├── lib/
│   └── supabase.ts              ← Supabase client configuration
├── store/
│   ├── authStore.ts             ← Auth state (session + profile)
│   ├── transactionStore.ts      ← Transactions (CRUD)
│   ├── budgetStore.ts           ← Budgets (CRUD)
│   └── goalStore.ts             ← Goals + contributions
├── types/
│   └── index.ts                 ← Shared TypeScript interfaces
├── utils/
│   └── categorize.ts            ← Auto-categorization, currency formatter, date utils
├── .env                         ← Supabase credentials (not committed)
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
git clone <your-repo-url>
cd expense-tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the Supabase dashboard, go to **SQL Editor** → **New Query**
3. Paste and run the full schema SQL from [Database Schema](#-database-schema) below
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**

### 3. Configure Environment Variables

Create (or update) the `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Own profile" ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Own transactions" ON transactions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own budgets" ON budgets USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals" ON goals USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own contributions" ON goal_contributions USING (
  EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_contributions.goal_id AND goals.user_id = auth.uid())
);

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

- **Dark Mode First** — The entire UI is built around a dark theme with indigo/blue accents for a modern, premium feel.
- **Nigerian Market Focus** — Default currency is NGN (₦), and the auto-categorizer includes 150+ Nigerian merchant keywords (Bolt, Opay, DSTV, Mama Put, etc.).
- **Offline-first architecture** — Zustand stores keep data in memory; the UX is fast even on slow connections.
- **Auth Guard** — The root layout enforces a sequential flow: Login → Profile Setup → Dashboard. Users can't skip onboarding.
- **Rule-based Categorization** — Transactions are auto-categorized by matching the description against a keyword map before the user even has to choose.

---

## 📍 Roadmap

- [x] Phase 1 — Core: Auth, Dashboard, Transactions, Budgets, Goals
- [ ] Phase 2 — Intelligence: AI-powered categorization (OpenAI Edge Function), recurring detection
- [ ] Phase 2 — Integration: Plaid bank account linking
- [ ] Phase 3 — Polish: Analytics/reports, notifications (budget alerts, bill reminders), accessibility

---

## 📄 License

MIT © Taofeek
