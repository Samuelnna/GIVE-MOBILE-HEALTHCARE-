import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSubaccountAction } from '../../../actions/subaccount';
import { flwService } from '../../../../services/flutterwave';

const ALLOWED_BANKS = new Set(flwService.getBanks().map((bank) => bank.code));
const PROVIDER_TABLES = ['hospitals', 'labs', 'pharmacies'] as const;

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return response;
}

function json(body: unknown, status = 200) {
  return withCors(NextResponse.json(body, { status }));
}

function clampShare(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(0.95, Math.max(0.05, number));
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return json({ success: false, error: 'Sign in required' }, 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return json({ success: false, error: 'Server is not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ success: false, error: 'Invalid session' }, 401);

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
  if (!profile) return json({ success: false, error: 'Profile not found' }, 403);

  const isAdmin = profile.user_type === 'admin' || profile.email === 'admin@givehealthcare.com';

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request body' }, 400);
  }

  const purpose = body.purpose === 'provider' ? 'provider' : 'self';
  const accountBank = String(body.account_bank || '').trim();
  const accountNumber = String(body.account_number || '').replace(/\D/g, '');
  const phone = String(body.business_mobile || body.phone || '08000000000').replace(/\D/g, '').slice(0, 14) || '08000000000';

  if (purpose === 'self') {
    if (profile.user_type !== 'professional' && !isAdmin) {
      return json({ success: false, error: 'Only professionals can set a payout account' }, 403);
    }
    if (profile.status && profile.status !== 'active') {
      return json({ success: false, error: 'Your account must be approved first' }, 403);
    }
    if (profile.subaccount_id) {
      return json({ success: false, error: 'Payout account is already configured' }, 409);
    }
    if (!ALLOWED_BANKS.has(accountBank)) {
      return json({ success: false, error: 'Choose a supported Nigerian bank' }, 400);
    }
    if (accountNumber.length < 10 || accountNumber.length > 12) {
      return json({ success: false, error: 'Enter a valid account number' }, 400);
    }

    const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 'commission_rates').single();
    const doctorShare = clampShare(settings?.data?.doctor_share, 0.7);
    const result = await createSubaccountAction({
      account_bank: accountBank,
      account_number: accountNumber,
      business_name: String(profile.full_name || authData.user.email || 'MobileDoc Professional').slice(0, 120),
      business_email: String(profile.email || authData.user.email || 'provider@mobiledoc.health').slice(0, 120),
      business_mobile: phone,
      split_value: Number((1 - doctorShare).toFixed(2)),
    });

    if (!result.success || !result.subaccount_id) {
      return json({ success: false, error: result.error || 'Could not create payout account' }, 400);
    }

    const bankName = flwService.getBanks().find((bank) => bank.code === accountBank)?.name || 'Bank';
    const bankDetails = {
      bank_name: bankName,
      bank_code: accountBank,
      account_number: accountNumber,
      account_name: profile.full_name || 'Professional',
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subaccount_id: result.subaccount_id, bank_details: bankDetails })
      .eq('id', authData.user.id);

    if (updateError) return json({ success: false, error: updateError.message }, 400);
    return json({ success: true, subaccount_id: result.subaccount_id, bank_details: bankDetails });
  }

  if (!isAdmin) return json({ success: false, error: 'Admin access required' }, 403);

  const table = String(body.table || '');
  if (!PROVIDER_TABLES.includes(table as (typeof PROVIDER_TABLES)[number])) {
    return json({ success: false, error: 'Invalid provider type' }, 400);
  }

  const name = String(body.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    return json({ success: false, error: 'Enter a valid business name' }, 400);
  }

  const location = String(body.location || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 120);
  const existingId = typeof body.subaccount_id === 'string' && /^RS_[A-Za-z0-9]+$/.test(body.subaccount_id)
    ? body.subaccount_id
    : null;

  const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 'commission_rates').single();
  const shareKey = table === 'hospitals' ? 'hospital_share' : table === 'labs' ? 'lab_share' : 'pharmacy_share';
  const fallback = table === 'labs' ? 0.8 : table === 'hospitals' ? 0.85 : 0.9;
  const providerShare = clampShare(settings?.data?.[shareKey], fallback);

  let subaccountId = existingId;
  if (!subaccountId && accountBank && accountNumber) {
    if (!ALLOWED_BANKS.has(accountBank)) {
      return json({ success: false, error: 'Choose a supported Nigerian bank' }, 400);
    }
    if (accountNumber.length < 10 || accountNumber.length > 12) {
      return json({ success: false, error: 'Enter a valid account number' }, 400);
    }
    const result = await createSubaccountAction({
      account_bank: accountBank,
      account_number: accountNumber,
      business_name: name,
      business_email: email || 'provider@mobiledoc.health',
      business_mobile: phone,
      split_value: Number((1 - providerShare).toFixed(2)),
    });
    if (!result.success || !result.subaccount_id) {
      return json({ success: false, error: result.error || 'Could not create payout account' }, 400);
    }
    subaccountId = result.subaccount_id;
  }

  const payload = {
    name,
    location,
    phone: String(body.phone || '').trim().slice(0, 20),
    email,
    subaccount_id: subaccountId,
    bank_details:
      accountBank && accountNumber
        ? { bank_code: accountBank, account_number: accountNumber }
        : null,
  };

  const { data: inserted, error: insertError } = await supabase.from(table).insert([payload]).select('*').single();
  if (insertError) return json({ success: false, error: insertError.message }, 400);

  return json({ success: true, subaccount_id: subaccountId, provider: inserted });
}
