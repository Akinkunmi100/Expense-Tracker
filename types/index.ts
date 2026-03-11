import { Category } from '../constants/Categories';

export interface Profile {
  id: string;
  display_name: string | null;
  income_type: 'salary' | 'freelance' | 'pension' | 'allowance' | 'other';
  currency: string;
  monthly_income: number | null;
  financial_goal_label: string | null;
  display_mode: 'simple' | 'detailed';
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
  plaid_transaction_id: string | null;
  source: 'manual' | 'plaid';
  notes: string | null;
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
