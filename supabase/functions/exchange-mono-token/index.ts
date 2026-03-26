// Supabase Edge Function: exchange-mono-token
// Exchanges a temporary Mono Connect auth code for a permanent account ID
// and saves the linked account to the database.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MONO_API_BASE = 'https://api.withmono.com/v2';

interface MonoAuthResponse {
  status: string;
  message: string;
  data: {
    id: string; // permanent account ID
  };
}

interface MonoAccountResponse {
  status: string;
  data: {
    account: {
      name: string;
      type: string;
      institution: {
        name: string;
        type: string;
      };
    };
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
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authentication code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Mono secret key from environment
    const monoSecretKey = Deno.env.get('MONO_SECRET_KEY');
    if (!monoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Mono secret key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Exchange the temporary code for a permanent account ID
    const authResponse = await fetch(`${MONO_API_BASE}/accounts/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mono-sec-key': monoSecretKey,
        'accept': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Mono auth error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Mono', details: errorText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authData: MonoAuthResponse = await authResponse.json();
    const monoAccountId = authData.data.id;

    // 2. Fetch account details (institution name, account type, etc.)
    let institutionName: string | null = null;
    let accountName: string | null = null;
    let accountType: string | null = null;

    try {
      const accountResponse = await fetch(`${MONO_API_BASE}/accounts/${monoAccountId}`, {
        headers: {
          'mono-sec-key': monoSecretKey,
          'accept': 'application/json',
        },
      });

      if (accountResponse.ok) {
        const accountData: MonoAccountResponse = await accountResponse.json();
        institutionName = accountData.data.account.institution?.name ?? null;
        accountName = accountData.data.account.name ?? null;
        accountType = accountData.data.account.type ?? null;
      }
    } catch (err) {
      // Non-fatal: we can still save the linked account without details
      console.warn('Could not fetch account details:', err);
    }

    // 3. Save to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the JWT token
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

    // Check if account is already linked
    const { data: existing } = await supabase
      .from('linked_accounts')
      .select('id')
      .eq('mono_account_id', monoAccountId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Reactivate if previously unlinked
      await supabase
        .from('linked_accounts')
        .update({ is_active: true })
        .eq('id', existing.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account re-linked',
          account: { id: existing.id, mono_account_id: monoAccountId, institution_name: institutionName },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new linked account
    const { data: newAccount, error: insertError } = await supabase
      .from('linked_accounts')
      .insert({
        user_id: user.id,
        mono_account_id: monoAccountId,
        institution_name: institutionName,
        account_name: accountName,
        account_type: accountType,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save linked account', details: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account linked successfully',
        account: newAccount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('exchange-mono-token error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
