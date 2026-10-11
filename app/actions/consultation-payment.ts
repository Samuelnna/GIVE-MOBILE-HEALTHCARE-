'use server';

import { createClient } from '@supabase/supabase-js';

const CONSULTATION_FEE = 1000;
const CURRENCY = 'NGN';

export async function isProfessionalConsultationPaymentConfigured() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.FLUTTERWAVE_SECRET_KEY
  );
}

export async function isDoctorConsultationPaymentConfigured() {
  return isProfessionalConsultationPaymentConfigured();
}

export async function recordVerifiedProfessionalConsultation(
  accessToken: string,
  transactionId: string,
  professionalId: string,
  professionalType: 'doctor' | 'professional' = 'professional'
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !flutterwaveSecretKey) {
    return { success: false, error: 'Payment verification is not configured on the server.' };
  }
  if (!accessToken || !transactionId || !/^[0-9a-f-]{36}$/i.test(professionalId)) {
    return { success: false, error: 'The payment details could not be verified.' };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user?.id || !user.email) {
    return { success: false, error: 'Please sign in again before confirming this payment.' };
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: professional, error: professionalError } = await serviceClient
    .from('profiles')
    .select('id, full_name, user_type, status, role, specialty')
    .eq('id', professionalId)
    .single();

  if (professionalError || professional?.user_type !== 'professional' || professional.status !== 'active') {
    return { success: false, error: 'The selected professional is not available for consultation.' };
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch (error) {
    console.error('Flutterwave professional consultation verification request failed:', error);
    return { success: false, error: 'We could not verify the payment right now. Please contact support before trying again.' };
  }

  if (!verificationResponse.ok) {
    console.error('Flutterwave consultation verification returned HTTP', verificationResponse.status);
    return { success: false, error: 'Flutterwave could not verify this payment.' };
  }

  const verification = await verificationResponse.json();
  const transaction = verification?.data;
  const paymentPurpose = transaction?.meta?.payment_purpose;
  const targetedProfessionalId = String(transaction?.meta?.professional_id || transaction?.meta?.doctor_id || '');
  const validPurpose = paymentPurpose === 'professional_consultation' || paymentPurpose === 'doctor_consultation';

  if (
    verification?.status !== 'success' ||
    transaction?.status !== 'successful' ||
    Number(transaction.amount) !== CONSULTATION_FEE ||
    transaction.currency !== CURRENCY ||
    String(transaction.customer?.email || '').toLowerCase() !== user.email.toLowerCase() ||
    !validPurpose ||
    targetedProfessionalId !== professional.id ||
    !String(transaction.tx_ref || '').startsWith('MDOC-')
  ) {
    return { success: false, error: 'The payment could not be confirmed for this account and consultation.' };
  }

  const { data: existingPayment, error: existingPaymentError } = await serviceClient
    .from('payments')
    .select('id')
    .eq('tx_ref', transaction.tx_ref)
    .maybeSingle();

  if (existingPaymentError) {
    console.error('Could not check for a duplicate consultation payment:', existingPaymentError);
    return { success: false, error: 'We could not save the verified payment. Please contact support.' };
  }
  if (existingPayment) {
    return { success: false, error: 'This payment has already been recorded.' };
  }

  const paymentType = professionalType === 'doctor' || /(doctor|physician|surgeon|consultant|general practitioner|gp|cardiologist|neurologist|pediatrician|dentist|specialist)/i.test(`${professional.role || ''} ${professional.specialty || ''}`)
    ? 'doctor_consultation'
    : 'professional_consultation';

  const { data: payment, error: paymentError } = await serviceClient
    .from('payments')
    .insert({
      user_id: user.id,
      amount: transaction.amount,
      currency: transaction.currency,
      tx_ref: transaction.tx_ref,
      flw_ref: transaction.flw_ref || null,
      flw_id: transaction.id || transactionId,
      payment_type: paymentType,
      status: 'successful',
      details: {
        professional_id: professional.id,
        professional_name: professional.full_name,
        professional_type: professional.role || 'professional',
        doctor_id: professionalType === 'doctor' ? professional.id : undefined,
      },
    })
    .select('*')
    .single();

  if (paymentError) {
    console.error('Could not save the verified consultation payment:', paymentError);
    return { success: false, error: 'We could not save the verified payment. Please contact support.' };
  }

  return { success: true, payment };
}

export async function recordVerifiedDoctorConsultation(
  accessToken: string,
  transactionId: string,
  professionalId: string
) {
  return recordVerifiedProfessionalConsultation(accessToken, transactionId, professionalId, 'doctor');
}
