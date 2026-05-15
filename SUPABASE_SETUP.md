# 🆕 SpendWise — New Supabase Setup Guide

This guide walks you through creating a brand-new Supabase project and wiring it up to SpendWise. Follow every step in order.

---

## Part 1 — Create a New Supabase Account & Project

### Step 1: Sign Up for Supabase
1. Open your browser and go to → **[https://supabase.com](https://supabase.com)**
2. Click **"Start your project"** (big green button)
3. Click **"Continue with GitHub"** or **"Continue with Google"**
   - 💡 **Tip**: Use a Google account you'll never forget (e.g., your main Gmail). This is what you'll use to log in forever.
4. Authorize Supabase when prompted
5. You'll land on your Supabase Dashboard

---

### Step 2: Create a New Project
1. Click **"New project"** (top right of the dashboard)
2. Fill in:
   - **Name**: `SpendWise` (or `Expenses Tracker`)
   - **Database Password**: create a **strong password** → write it down somewhere safe
   - **Region**: Select `West EU (Ireland)` ← same region as the old one, for consistency
3. Click **"Create new project"**
4. ⏳ Wait 1–2 minutes for the project to provision — you'll see a progress bar

---

### Step 3: Get Your API Keys
Once the project is ready:
1. In the sidebar click **"Project Settings"** (gear icon at the bottom left)
2. Click **"API"** in the sub-menu
3. You'll see two values you need — **copy them both**:

| Key | Where it appears |
|---|---|
| **Project URL** | Under "Project URL" — looks like `https://xxxxxxxxxxxx.supabase.co` |
| **anon / public key** | Under "Project API Keys" → `anon` `public` row |

> ⚠️ Do NOT copy the `service_role` key — that one is secret and dangerous to expose.

---

## Part 2 — Set Up the Database Schema

You need to run SQL to create all the tables the app uses.

### Step 4: Open the SQL Editor
1. In the left sidebar click **"SQL Editor"**
2. Click **"New query"** (top right)

---

### Step 5: Run the Schema — Copy & Paste Each Block

Run these **one block at a time** — paste each into the editor and click **"Run"** (or press `Ctrl+Enter`).

---

#### Block 1 — Profiles Table

```sql
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
```

---

#### Block 2 — Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly','monthly','yearly')),
  payment_method TEXT,
  bank_transaction_id TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','mono')),
  transaction_mode TEXT DEFAULT 'personal' CHECK (transaction_mode IN ('personal','business')),
  sales_channel TEXT,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_type TEXT CHECK (tax_type IN ('VAT','WHT')),
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### Block 3 — Budgets Table

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly','biweekly','monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### Block 4 — Goals & Contributions Tables

```sql
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

CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  note TEXT
);
```

---

#### Block 5 — Invoices & Invoice Items (Business Mode)

```sql
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

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### Block 6 — Products / Inventory (Business Mode)

```sql
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
```

---

#### Block 7 — Linked Bank Accounts (Mono Integration)

```sql
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
```

---

#### Block 8 — Receivables (Business Mode)

```sql
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
```

---

#### Block 9 — Row Level Security (CRITICAL — Do Not Skip)

> ⚠️ This locks down the database so each user can ONLY access their own data.

```sql
-- Enable RLS on all tables
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

-- Policies
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
```

---

#### Block 10 — Auto-Create Profile on Sign-Up (CRITICAL)

> ⚠️ Without this, new users will be stuck on a blank screen after signing up.

```sql
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

### Step 6: Enable Email Auth
1. In the left sidebar go to **"Authentication"** → **"Providers"**
2. Make sure **"Email"** is turned **ON**
3. Optionally turn on **"Google"** OAuth if you want social login

---

## Part 3 — Switch the App to the New Project

This is the only file you need to change in the codebase.

### Step 7: Update the `.env` file

Open the file at:
```
c:\Users\MICHAEL\Desktop\Taofeek\expense-tracker\.env
```

Replace the values with the ones you copied in Step 3:

```env
# Supabase Configuration — NEW PROJECT
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE

# Mono Connect (keep the same — your Mono key does not change)
EXPO_PUBLIC_MONO_PUBLIC_KEY=test_pk_p0435l33f6sg3uktfn3x
```

> **Current (old) values for reference:**
> - Old URL: `https://fxvuppjizrwxbvoismpc.supabase.co`
> - Old anon key starts with: `eyJhbGci...` (long token in your current .env)

---

### Step 8: Restart the App

Stop the dev server if it's running (`Ctrl+C`) then:

```bash
npm start
```

The app will now connect to your new Supabase project.

---

## Part 4 — Verify Everything Works

### Step 9: Test the new setup
1. Open the app → click **"Sign Up"** with a new email
2. You should land on the **Profile Setup** screen → fill it in
3. You should see the **Mode Selection** (Personal / Business) screen
4. You should see the **Routine Expenses** setup screen
5. You should arrive at the **Dashboard** with no errors

### Step 10: Confirm data appears in Supabase
1. Go to your new Supabase dashboard
2. Click **"Table Editor"** in the sidebar
3. Open the `profiles` table — you should see your new user's row
4. Open `transactions` — you should see any expenses you add

---

## Summary Checklist

- [ ] Created new Supabase account (noted the email/Google account used!)
- [ ] Created new project and noted the Region
- [ ] Copied Project URL and anon key
- [ ] Ran all 10 SQL blocks in the SQL Editor
- [ ] Enabled Email auth in Authentication → Providers
- [ ] Updated `.env` with new URL and anon key
- [ ] Restarted the app with `npm start`
- [ ] Signed up as a new user and verified data appears in Table Editor

---

> 💡 **Tip**: Write your new Supabase login email somewhere permanent — your phone notes, a sticky note, or a free password manager like Bitwarden. This is the most important thing to not lose.
