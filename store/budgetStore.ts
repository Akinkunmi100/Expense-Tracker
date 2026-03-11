import { create } from 'zustand';
import { Budget } from '../types';
import { supabase } from '../lib/supabase';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  fetchBudgets: (userId: string) => Promise<void>;
  addBudget: (
    budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'is_active' | 'spent'>,
    userId: string
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) {
      set({ budgets: data as Budget[] });
    }
    set({ isLoading: false });
  },

  addBudget: async (budget, userId) => {
    const payload = {
      ...budget,
      user_id: userId,
      is_active: true,
    };
    const { data, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      set((state) => ({
        budgets: [data as Budget, ...state.budgets],
      }));
    }
  },

  deleteBudget: async (id) => {
    await supabase.from('budgets').update({ is_active: false }).eq('id', id);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
  },
}));
