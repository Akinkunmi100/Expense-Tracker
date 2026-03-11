import { create } from 'zustand';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { categorizeTransaction } from '../utils/categorize';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: (userId: string) => Promise<void>;
  addTransaction: (
    tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'source' | 'plaid_transaction_id'>,
    userId: string
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Pick<Transaction, 'description' | 'amount' | 'category' | 'date' | 'notes' | 'is_recurring' | 'recurrence_interval'>>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(200);
    if (!error && data) {
      set({ transactions: data as Transaction[] });
    }
    set({ isLoading: false });
  },

  addTransaction: async (tx, userId) => {
    const category = tx.category ?? categorizeTransaction(tx.description);
    const payload = {
      ...tx,
      category,
      user_id: userId,
      source: 'manual' as const,
      plaid_transaction_id: null,
    };
    
    // OPTIMISTIC UPDATE
    const tempId = `temp_${Date.now()}`;
    const optimisticTx = { ...payload, id: tempId, created_at: new Date().toISOString() } as Transaction;
    set((state) => ({ transactions: [optimisticTx, ...state.transactions] }));

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update with real ID
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === tempId ? (data as Transaction) : t)),
      }));
    } catch (err) {
      // Rollback
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== tempId),
      }));
      throw err;
    }
  },

  updateTransaction: async (id, updates) => {
    // OPTIMISTIC UPDATE
    const previousState = get().transactions;
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Sync exact response
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? (data as Transaction) : t)),
      }));
    } catch (err) {
      // Rollback
      set({ transactions: previousState });
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    // OPTIMISTIC UPDATE
    const previousState = get().transactions;
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      // Rollback
      set({ transactions: previousState });
      throw err;
    }
  },
}));
