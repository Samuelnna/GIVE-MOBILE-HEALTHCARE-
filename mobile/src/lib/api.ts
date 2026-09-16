import Constants from 'expo-constants';
import { supabase } from './supabase';

export function apiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri || '';
  const host = String(hostUri).replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (host && !['localhost', '127.0.0.1', 'exp.host'].includes(host)) {
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

async function authedPost(path: string, body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    throw new Error(
      payload.error ||
        'Could not reach the MobileDoc API. Start the website with npm run dev so this action can run securely.'
    );
  }
  return payload;
}

export function setupSelfPayout(input: { account_bank: string; account_number: string }) {
  return authedPost('/api/flutterwave/subaccount', {
    purpose: 'self',
    account_bank: input.account_bank,
    account_number: input.account_number,
  });
}
