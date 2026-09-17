import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runTriageAIAction } from '../../../actions/ai';

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return response;
}

function json(body: unknown, status = 200) {
  return withCors(NextResponse.json(body, { status }));
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', authData.user.id)
    .single();

  if (profile?.user_type !== 'patient') {
    return json({ success: false, error: 'AI triage is available to patients only.' }, 403);
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request' }, 400);
  }

  const userInput = String(body.userInput || '').trim().slice(0, 4000);
  if (userInput.length < 2) {
    return json({ success: false, error: 'Describe your symptoms to continue.' }, 400);
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-20).map((message: any) => ({
        role: message?.role === 'user' ? 'user' : 'model',
        text: String(message?.text || '').slice(0, 4000),
      }))
    : [];

  const language = ['Auto-detect', 'English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa'].includes(body.language)
    ? body.language
    : 'Auto-detect';
  const result = await runTriageAIAction(userInput, history, language);
  return json(result, result.success ? 200 : 502);
}
