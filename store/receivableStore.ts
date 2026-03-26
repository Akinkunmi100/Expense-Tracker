import { create } from 'zustand';
import { Receivable } from '../types';
import { supabase } from '../lib/supabase';

interface ReceivableState {
  receivables: Receivable[];
  isLoading: boolean;
  fetchReceivables: (userId: string) => Promise<void>;
  addReceivable: (
    receivable: { customer_name: string; amount: number; description?: string; due_date?: string },
    userId: string
  ) => Promise<void>;
  markAsPaid: (id: string, matchedTransactionId?: string) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;
}

export const useReceivableStore = create<ReceivableState>((set, get) => ({
  receivables: [],
  isLoading: false,

  fetchReceivables: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('receivables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      set({ receivables: data as Receivable[] });
    }
    set({ isLoading: false });
  },

  addReceivable: async (receivable, userId) => {
    const payload = {
      ...receivable,
      user_id: userId,
      status: 'pending' as const,
    };

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      ...payload,
      id: tempId,
      description: receivable.description ?? null,
      due_date: receivable.due_date ?? null,
      matched_transaction_id: null,
      created_at: new Date().toISOString(),
    } as Receivable;
    set((state) => ({ receivables: [optimistic, ...state.receivables] }));

    try {
      const { data, error } = await supabase
        .from('receivables')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        receivables: state.receivables.map((r) =>
          r.id === tempId ? (data as Receivable) : r
        ),
      }));
    } catch (err) {
      set((state) => ({
        receivables: state.receivables.filter((r) => r.id !== tempId),
      }));
      throw err;
    }
  },

  markAsPaid: async (id, matchedTransactionId) => {
    const previous = get().receivables;
    set((state) => ({
      receivables: state.receivables.map((r) =>
        r.id === id ? { ...r, status: 'paid' as const } : r
      ),
    }));

    try {
      const updates: any = { status: 'paid' };
      if (matchedTransactionId) {
        updates.matched_transaction_id = matchedTransactionId;
      }
      const { error } = await supabase
        .from('receivables')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      set({ receivables: previous });
      throw err;
    }
  },

  deleteReceivable: async (id) => {
    const previous = get().receivables;
    set((state) => ({
      receivables: state.receivables.filter((r) => r.id !== id),
    }));

    try {
      const { error } = await supabase.from('receivables').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      set({ receivables: previous });
      throw err;
    }
  },
}));
