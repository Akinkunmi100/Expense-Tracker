import { create } from 'zustand';
import { LinkedAccount } from '../types';
import { supabase } from '../lib/supabase';

interface MonoState {
  linkedAccounts: LinkedAccount[];
  isLinking: boolean;
  isSyncing: boolean;
  syncingAccountId: string | null;
  isLoading: boolean;

  fetchLinkedAccounts: (userId: string) => Promise<void>;
  linkAccount: (code: string) => Promise<LinkedAccount | null>;
  syncTransactions: (linkedAccountId: string, appMode: 'personal' | 'business') => Promise<{ imported: number } | null>;
  unlinkAccount: (accountId: string) => Promise<void>;
}

export const useMonoStore = create<MonoState>((set, get) => ({
  linkedAccounts: [],
  isLinking: false,
  isSyncing: false,
  syncingAccountId: null,
  isLoading: false,

  fetchLinkedAccounts: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ linkedAccounts: data as LinkedAccount[] });
    }
    set({ isLoading: false });
  },

  linkAccount: async (code) => {
    set({ isLinking: true });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('exchange-mono-token', {
        body: { code },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      if (data?.account) {
        const account = data.account as LinkedAccount;
        set((state) => ({
          linkedAccounts: [account, ...state.linkedAccounts.filter((a) => a.id !== account.id)],
        }));
        return account;
      }

      return null;
    } catch (err) {
      console.error('[SpendWise] Link account error:', err);
      throw err;
    } finally {
      set({ isLinking: false });
    }
  },

  syncTransactions: async (linkedAccountId, appMode = 'personal') => {
    set({ isSyncing: true, syncingAccountId: linkedAccountId });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('sync-mono-transactions', {
        body: { linked_account_id: linkedAccountId, app_mode: appMode },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      // Update last_synced_at locally
      if (data?.success) {
        set((state) => ({
          linkedAccounts: state.linkedAccounts.map((a) =>
            a.id === linkedAccountId
              ? { ...a, last_synced_at: new Date().toISOString() }
              : a
          ),
        }));
        return { imported: data.imported ?? 0 };
      }

      return null;
    } catch (err) {
      console.error('[SpendWise] Sync transactions error:', err);
      throw err;
    } finally {
      set({ isSyncing: false, syncingAccountId: null });
    }
  },

  unlinkAccount: async (accountId) => {
    // Optimistic update
    const previousAccounts = get().linkedAccounts;
    set((state) => ({
      linkedAccounts: state.linkedAccounts.filter((a) => a.id !== accountId),
    }));

    try {
      const { error } = await supabase
        .from('linked_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;
    } catch (err) {
      // Rollback
      set({ linkedAccounts: previousAccounts });
      throw err;
    }
  },
}));
