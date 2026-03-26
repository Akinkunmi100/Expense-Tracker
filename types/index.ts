import { Category } from '../constants/Categories';

export interface Profile {
  id: string;
  display_name: string | null;
  income_type: 'salary' | 'freelance' | 'pension' | 'allowance' | 'other';
  currency: string;
  monthly_income: number | null;
  financial_goal_label: string | null;
  display_mode: 'simple' | 'detailed';
  app_mode: 'personal' | 'business';
  has_onboarded: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: Category;
  date: string; // ISO date string
  payment_method: string | null;
  is_recurring: boolean;
  recurrence_interval: 'weekly' | 'monthly' | 'yearly' | null;
  bank_transaction_id: string | null;
  source: 'manual' | 'mono';
  transaction_mode: 'personal' | 'business';
  sales_channel: string | null;
  tax_amount: number;
  tax_rate: number;
  tax_type: 'VAT' | 'WHT';
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: Category;
  limit_amount: number;
  period: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  is_active: boolean;
  created_at: string;
  // computed fields (from queries)
  spent?: number;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  note: string | null;
}

export interface LinkedAccount {
  id: string;
  user_id: string;
  mono_account_id: string;
  institution_name: string | null;
  account_name: string | null;
  account_type: string | null;
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Receivable {
  id: string;
  user_id: string;
  customer_name: string;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  matched_transaction_id: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  due_date: string | null;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  items?: InvoiceItem[];
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  selling_price: number;
  cost_price: number;
  unit: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
}
