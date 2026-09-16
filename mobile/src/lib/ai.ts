import type { ChatMessage, TriageResult } from '@/src/types';
import { apiBaseUrl } from './api';
import { supabase } from './supabase';

function extractJson(text: string): TriageResult | null {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (parsed?.triageLevel) return parsed as TriageResult;
  } catch {
    return null;
  }
  return null;
}

export async function runTriage(userInput: string, history: ChatMessage[]) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { success: false as const, error: 'Please sign in again to use AI triage.' };
  }

  const response = await fetch(`${apiBaseUrl()}/api/ai/triage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userInput,
      history: history.map((message) => ({ role: message.role, text: message.text })),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    return {
      success: false as const,
      error:
        payload.error ||
        'Could not reach the MobileDoc AI service. Start the website with npm run dev so triage can run securely.',
    };
  }

  const text = String(payload.text || '');
  return {
    success: true as const,
    text,
    result: extractJson(text),
  };
}
