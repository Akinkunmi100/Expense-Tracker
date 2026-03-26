import { create } from 'zustand';
import { Invoice, InvoiceItem } from '../types';
import { supabase } from '../lib/supabase';

interface InvoiceState {
  invoices: Invoice[];
  isLoading: boolean;
  fetchInvoices: (userId: string) => Promise<void>;
  addInvoice: (
    invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'status' | 'items'>,
    items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'amount'>[],
    userId: string
  ) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  isLoading: false,

  fetchInvoices: async (userId) => {
    set({ isLoading: true });
    
    // Fetch invoices and their items
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ invoices: data as Invoice[] });
    }
    set({ isLoading: false });
  },

  addInvoice: async (invoice, items, userId) => {
    try {
      // 1. Insert invoice
      const invoicePayload = {
        ...invoice,
        user_id: userId,
        status: 'Draft' as const,
      };

      const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single();
        
      if (invError) throw invError;

      // 2. Insert items
      const itemsPayload = items.map(item => ({
        ...item,
        invoice_id: newInvoice.id,
        amount: item.quantity * item.unit_price
      }));

      const { data: newItems, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload)
        .select();

      if (itemsError) throw itemsError;

      // Update local state
      const completeInvoice: Invoice = {
        ...newInvoice,
        items: newItems as InvoiceItem[]
      };

      set((state) => ({ invoices: [completeInvoice, ...state.invoices] }));
    } catch (err) {
      console.error('Failed to add invoice', err);
      throw err;
    }
  },

  updateInvoiceStatus: async (id, status) => {
    const previousState = get().invoices;
    
    // Optimistic update
    set((state) => ({
      invoices: state.invoices.map((inv) => inv.id === id ? { ...inv, status } : inv)
    }));

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      set({ invoices: previousState });
      throw err;
    }
  },

  deleteInvoice: async (id) => {
    const previousState = get().invoices;
    
    // Optimistic delete
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id)
    }));

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      set({ invoices: previousState });
      throw err;
    }
  }
}));
