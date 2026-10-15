'use server';

import { createClient } from '@supabase/supabase-js';
import { checkoutUser, confirmCheckout, prepareCheckout } from '../lib/consultation-checkout';

export async function prepareConsultationPayment(token: string, professionalId: string) {
  try { return { success: true, payment: await prepareCheckout(token, professionalId) }; }
  catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not prepare consultation checkout.' }; }
}

export async function confirmConsultationPayment(token: string, reference: string, transactionId?: string) {
  try {
    const user = await checkoutUser(token);
    return { success: true, payment: await confirmCheckout(reference, user.id, transactionId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not confirm consultation payment.' };
  }
}

const CONSULTATION_FEE = 100;
const CURRENCY = 'NGN';

// Public checkout configuration is safe to send to the browser. Read it at
// request time so changing keys does not leave checkout using an old JS bundle.
export async function getCheckoutPublicKey() {
  const publicKey = (process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || '').trim();
  if (!publicKey.startsWith('FLWPUBK') || /\s|\*{3,}/.test(publicKey)) {
    return { success: false, error: 'The server checkout public key is missing or malformed. Copy the complete public key from Flutterwave API settings and restart localhost.' };
  }
  return { success: true, publicKey };
}

export async function getProfessionalConsultationPaymentConfiguration() {
  const missing: string[] = [];
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL)');
  }
  if (!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    missing.push('FLUTTERWAVE_SECRET_KEY');
  }
  return { configured: missing.length === 0, missing };
}

export async function isProfessionalConsultationPaymentConfigured() {
  return (await getProfessionalConsultationPaymentConfiguration()).configured;
}

export async function isDoctorConsultationPaymentConfigured() {
  return isProfessionalConsultationPaymentConfigured();
}

export async function recordVerifiedProfessionalConsultation(
  accessToken: string,
  transactionId: string,
  professionalId: string,
  professionalType: 'doctor' | 'professional' = 'professional',
  transactionReference?: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !flutterwaveSecretKey) {
    return { success: false, error: 'Payment verification is not configured on the server.' };
  }
  if (
    !accessToken ||
    (!transactionId && !transactionReference) ||
    (transactionReference && !/^MDOC-[A-Za-z0-9-]+$/.test(transactionReference)) ||
    !/^[0-9a-f-]{36}$/i.test(professionalId)
  ) {
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

  if (professionalError || professional?.user_type !== 'professional') {
    return { success: false, error: 'The selected account is not a healthcare professional. Contact support to reconcile this successful payment.' };
  }

  const verificationHeaders = { Authorization: `Bearer ${flutterwaveSecretKey}` };
  let verification: any = null;
  let verificationError: unknown;

  if (/^\d+$/.test(transactionId)) {
    try {
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
        { headers: verificationHeaders, signal: AbortSignal.timeout(10000) }
      );
      if (response.ok) verification = await response.json();
      else verificationError = new Error(`Flutterwave transaction-ID verification returned HTTP ${response.status}.`);
    } catch (error) {
      verificationError = error;
    }
  }

  if (verification?.status !== 'success' && transactionReference) {
    try {
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionReference)}`,
        { headers: verificationHeaders, signal: AbortSignal.timeout(10000) }
      );
      if (response.ok) verification = await response.json();
      else verificationError = new Error(`Flutterwave reference verification returned HTTP ${response.status}.`);
    } catch (error) {
      verificationError = error;
    }
  }

  if (!verification) {
    console.error('Flutterwave professional consultation verification failed:', verificationError);
    return { success: false, error: 'Flutterwave could not verify this payment. Please contact support.' };
  }

  if (verification.status !== 'success' || !verification.data) {
    console.error('Flutterwave did not find a transaction for the supplied ID or reference:', {
      transactionIdProvided: Boolean(transactionId),
      transactionReferenceProvided: Boolean(transactionReference),
      message: verification.message,
    });
    return {
      success: false,
      error: 'Flutterwave could not find this transaction using the supplied ID or reference. Confirm both values belong to the same successful charge and try again.',
    };
  }

  const transaction = verification?.data;
  const transactionMeta = Array.isArray(transaction?.meta)
    ? Object.fromEntries(
        transaction.meta
          .filter((item: any) => item && typeof item.metaname === 'string')
          .map((item: any) => [item.metaname, item.metavalue])
      )
    : transaction?.meta && typeof transaction.meta === 'object'
      ? transaction.meta
      : {};
  const paymentPurpose = transactionMeta.payment_purpose;
  const targetedProfessionalId = String(transactionMeta.professional_id || transactionMeta.doctor_id || '');
  const validPurpose = paymentPurpose === 'professional_consultation' || paymentPurpose === 'doctor_consultation';

  if (
    verification?.status !== 'success' ||
    transaction?.status !== 'successful' ||
    Number(transaction.amount) !== CONSULTATION_FEE ||
    transaction.currency !== CURRENCY ||
    String(transaction.customer?.email || '').toLowerCase() !== user.email.toLowerCase() ||
    !validPurpose ||
    targetedProfessionalId !== professional.id ||
    (transactionReference && transaction.tx_ref !== transactionReference) ||
    !String(transaction.tx_ref || '').startsWith('MDOC-')
  ) {
    if (!validPurpose || targetedProfessionalId !== professional.id) {
      return {
        success: false,
        error: 'Flutterwave confirmed the charge, but its consultation metadata is missing or does not match the selected professional. Contact support to reconcile this payment; do not pay again.',
      };
    }
    return { success: false, error: 'The payment could not be confirmed for this account and consultation.' };
  }

  const { data: existingPayment, error: existingPaymentError } = await serviceClient
    .from('payments')
    .select('*')
    .eq('tx_ref', transaction.tx_ref)
    .maybeSingle();

  if (existingPaymentError) {
    console.error('Could not check for a duplicate consultation payment:', existingPaymentError);
    return { success: false, error: 'We could not save the verified payment. Please contact support.' };
  }
  if (existingPayment) {
    const existingDetails = existingPayment.details || {};
    if (
      existingPayment.user_id === user.id &&
      existingPayment.status === 'successful' &&
      String(existingDetails.professional_id || existingDetails.doctor_id || '') === professional.id
    ) {
      return { success: true, payment: existingPayment, canBook: professional.status === 'active' };
    }
    return { success: false, error: 'This payment reference is already associated with another transaction.' };
  }

  const paymentType = professionalType === 'doctor' || /(doctor|physician|surgeon|consultant|general practitioner|gp|cardiologist|neurologist|pediatrician|dentist|specialist)/i.test(`${professional?.role || ''} ${professional?.specialty || ''}`)
    ? 'doctor_consultation'
    : 'professional_consultation';
  const flutterwaveId = typeof transaction.id === 'string'
    ? transaction.id
    : Number.isSafeInteger(transaction.id)
      ? String(transaction.id)
      : null;

  const { data: payment, error: paymentError } = await serviceClient
    .from('payments')
    .insert({
      user_id: user.id,
      amount: transaction.amount,
      currency: transaction.currency,
      tx_ref: transaction.tx_ref,
      flw_ref: transaction.flw_ref || null,
      flw_id: flutterwaveId,
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
    if (paymentError.code === '22003') {
      return {
        success: false,
        error: 'Supabase cannot store this Flutterwave transaction ID because payments.flw_id is numeric. Run fix_flw_id_column_type.sql in Supabase SQL Editor, then contact support to record this already successful payment.',
      };
    }
    return {
      success: false,
      error: `Supabase could not save the verified payment: ${paymentError.message}`,
    };
  }

  return { success: true, payment, canBook: professional?.status === 'active' };
}

export async function recordVerifiedDoctorConsultation(
  accessToken: string,
  transactionId: string,
  professionalId: string
) {
  return recordVerifiedProfessionalConsultation(accessToken, transactionId, professionalId, 'doctor');
}
