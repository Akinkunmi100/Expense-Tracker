// Supabase Edge Function: sync-mono-transactions
// Fetches transactions from a linked Mono account and imports them
// into the transactions table (with deduplication and auto-categorization).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MONO_API_BASE = 'https://api.withmono.com/v2';

// Keyword → Category mapping (mirrors the client-side KEYWORD_MAP)
const KEYWORD_MAP: Record<string, string> = {
  restaurant: 'Food & Dining', food: 'Food & Dining', eat: 'Food & Dining',
  lunch: 'Food & Dining', dinner: 'Food & Dining', breakfast: 'Food & Dining',
  cafe: 'Food & Dining', coffee: 'Food & Dining', pizza: 'Food & Dining',
  burger: 'Food & Dining', chicken: 'Food & Dining', domino: 'Food & Dining',
  shoprite: 'Food & Dining', supermarket: 'Food & Dining', grocery: 'Food & Dining',
  market: 'Food & Dining', mama: 'Food & Dining', buka: 'Food & Dining',
  kfc: 'Food & Dining', mcdonalds: 'Food & Dining',
  uber: 'Transport', bolt: 'Transport', taxi: 'Transport', bus: 'Transport',
  fuel: 'Transport', petrol: 'Transport', diesel: 'Transport',
  transport: 'Transport', okada: 'Transport', keke: 'Transport',
  electricity: 'Utilities', nepa: 'Utilities', ibedc: 'Utilities', ekedc: 'Utilities',
  dstv: 'Utilities', gotv: 'Utilities', startimes: 'Utilities',
  internet: 'Utilities', airtime: 'Utilities', data: 'Utilities',
  mtn: 'Utilities', airtel: 'Utilities', glo: 'Utilities', water: 'Utilities',
  rent: 'Housing & Rent', house: 'Housing & Rent', apartment: 'Housing & Rent', landlord: 'Housing & Rent',
  hospital: 'Healthcare', pharmacy: 'Healthcare', drug: 'Healthcare',
  doctor: 'Healthcare', clinic: 'Healthcare',
  school: 'Education', tuition: 'Education', book: 'Education',
  course: 'Education', training: 'Education',
  cinema: 'Entertainment', netflix: 'Entertainment', spotify: 'Entertainment', game: 'Entertainment',
  clothes: 'Shopping', shoe: 'Shopping', fashion: 'Shopping',
  jumia: 'Shopping', konga: 'Shopping', amazon: 'Shopping',
  flight: 'Travel', hotel: 'Travel', trip: 'Travel', holiday: 'Travel', airbnb: 'Travel',
};

function categorizeTransaction(narration: string): string {
  const lower = narration.toLowerCase().trim();
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return 'Other';
}

interface MonoTransaction {
  _id: string;
  narration: string;
  amount: number; // in kobo
  type: 'debit' | 'credit';
  balance: number;
  date: string;
  category?: string;
}

interface MonoTransactionsResponse {
  status: string;
  data: MonoTransaction[];
  meta?: {
    total: number;
    page: number;
    previous: string | null;
    next: string | null;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { linked_account_id, app_mode } = await req.json();

    if (!linked_account_id || !app_mode) {
      return new Response(
        JSON.stringify({ error: 'Missing linked_account_id or app_mode' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const monoSecretKey = Deno.env.get('MONO_SECRET_KEY');
    if (!monoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Mono secret key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role (bypasses RLS for cross-table ops)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get the linked account
    const { data: linkedAccount, error: accountError } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('id', linked_account_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (accountError || !linkedAccount) {
      return new Response(
        JSON.stringify({ error: 'Linked account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch transactions from Mono (last 90 days, or since last sync)
    const now = new Date();
    const fromDate = linkedAccount.last_synced_at
      ? new Date(linkedAccount.last_synced_at)
      : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const monoUrl = `${MONO_API_BASE}/accounts/${linkedAccount.mono_account_id}/transactions?start=${fromStr}&end=${toStr}&paginate=false`;

    const monoResponse = await fetch(monoUrl, {
      headers: {
        'mono-sec-key': monoSecretKey,
        'accept': 'application/json',
        'x-real-time': 'true',
      },
    });

    if (!monoResponse.ok) {
      const errorText = await monoResponse.text();
      console.error('Mono transactions error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions from Mono', details: errorText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const monoData: MonoTransactionsResponse = await monoResponse.json();
    const monoTransactions = monoData.data ?? [];

    if (monoTransactions.length === 0) {
      // Update last synced even if no new transactions
      await supabase
        .from('linked_accounts')
        .update({ last_synced_at: now.toISOString() })
        .eq('id', linked_account_id);

      return new Response(
        JSON.stringify({ success: true, imported: 0, message: 'No new transactions found' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get existing bank_transaction_ids to deduplicate
    const monoIds = monoTransactions.map((t) => t._id);
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('bank_transaction_id')
      .in('bank_transaction_id', monoIds);

    const existingIds = new Set((existingTxs ?? []).map((t: any) => t.bank_transaction_id));

    // 4. Prepare new transactions for import
    const newTransactions = monoTransactions
      .filter((t) => !existingIds.has(t._id))
      .map((t) => ({
        user_id: user.id,
        amount: Math.abs(t.amount / 100), // Convert kobo → naira, always positive
        description: t.narration || 'Bank transaction',
        // Credits → always 'Income'; Debits → keyword-based categorization
        category: t.type === 'credit'
          ? 'Income'
          : categorizeTransaction(t.narration || ''),
        date: t.date.split('T')[0], // ISO date string
        payment_method: t.type === 'debit' ? 'bank_transfer' : 'bank_credit',
        is_recurring: false,
        recurrence_interval: null,
        bank_transaction_id: t._id,
        source: 'mono',
        transaction_mode: app_mode,
        notes: t.type === 'credit' ? 'Income (bank credit)' : null,
      }));

    if (newTransactions.length === 0) {
      await supabase
        .from('linked_accounts')
        .update({ last_synced_at: now.toISOString() })
        .eq('id', linked_account_id);

      return new Response(
        JSON.stringify({ success: true, imported: 0, message: 'All transactions already synced' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Batch insert new transactions
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(newTransactions);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to import transactions', details: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Update last_synced_at
    await supabase
      .from('linked_accounts')
      .update({ last_synced_at: now.toISOString() })
      .eq('id', linked_account_id);

    return new Response(
      JSON.stringify({
        success: true,
        imported: newTransactions.length,
        total_fetched: monoTransactions.length,
        message: `Successfully imported ${newTransactions.length} new transactions`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sync-mono-transactions error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
