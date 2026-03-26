import { create } from 'zustand';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { categorizeTransaction } from '../utils/categorize';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: (userId: string, mode?: 'personal' | 'business') => Promise<void>;
  addTransaction: (
    tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'source' | 'bank_transaction_id' | 'transaction_mode' | 'is_archived'>,
    userId: string,
    mode?: 'personal' | 'business'
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Pick<Transaction, 'description' | 'amount' | 'category' | 'date' | 'notes' | 'is_recurring' | 'recurrence_interval' | 'is_archived'>>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkArchiveTransactions: (userId: string, start: Date, end: Date, mode?: 'personal' | 'business') => Promise<void>;
  bulkDeleteTransactions: (userId: string, start: Date, end: Date, mode?: 'personal' | 'business') => Promise<void>;
  fetchArchivedTransactions: (userId: string) => Promise<Transaction[]>;
  restoreTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async (userId, mode) => {
    set({ isLoading: true });
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('date', { ascending: false })
      .limit(300);

    // Filter by mode if specified
    if (mode) {
      query = query.eq('transaction_mode', mode);
    }

    const { data, error } = await query;
    if (!error && data) {
      set({ transactions: data as Transaction[] });
    }
    set({ isLoading: false });
  },

  addTransaction: async (tx, userId, mode = 'personal') => {
    const category = tx.category ?? categorizeTransaction(tx.description);
    const payload = {
      ...tx,
      category,
      user_id: userId,
      source: 'manual' as const,
      bank_transaction_id: null,
      transaction_mode: mode,
      is_archived: false,
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

  bulkArchiveTransactions: async (userId, start, end, mode) => {
    // OPTIMISTIC UPDATE
    const previousState = get().transactions;
    set((state) => ({
      transactions: state.transactions.filter((t) => {
        const d = new Date(t.date);
        const inRange = d >= start && d <= end;
        if (!inRange) return true;
        if (mode && t.transaction_mode !== mode) return true;
        return false; // hide it immediately
      }),
    }));

    try {
      let query = supabase
        .from('transactions')
        .update({ is_archived: true })
        .eq('user_id', userId)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());
      
      if (mode) query = query.eq('transaction_mode', mode);

      const { error } = await query;
      if (error) throw error;
    } catch (err) {
      set({ transactions: previousState });
      throw err;
    }
  },

  bulkDeleteTransactions: async (userId, start, end, mode) => {
    // OPTIMISTIC UPDATE
    const previousState = get().transactions;
    set((state) => ({
      transactions: state.transactions.filter((t) => {
        const d = new Date(t.date);
        const inRange = d >= start && d <= end;
        if (!inRange) return true;
        if (mode && t.transaction_mode !== mode) return true;
        return false;
      }),
    }));

    try {
      let query = supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());
      
      if (mode) query = query.eq('transaction_mode', mode);

      const { error } = await query;
      if (error) throw error;
    } catch (err) {
      // Rollback
      set({ transactions: previousState });
      throw err;
    }
  },

  fetchArchivedTransactions: async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', true)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as Transaction[];
  },

  restoreTransaction: async (id) => {
    const { data, error } = await supabase
      .from('transactions')
      .update({ is_archived: false })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // add it back to the active list locally
    set((state) => ({
      transactions: [data as Transaction, ...state.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));
  },
}));
