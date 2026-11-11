import { NextRequest, NextResponse } from 'next/server';
import { validWhatsAppSignature, incomingWhatsAppMessages } from '../../../lib/whatsapp';
import { handleWhatsAppTriage } from '../../../lib/whatsapp-triage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!token) return new NextResponse('Webhook is not configured', { status: 503 });
  if (params.get('hub.mode') !== 'subscribe' || params.get('hub.verify_token') !== token || !params.has('hub.challenge')) {
    return new NextResponse('Verification failed', { status: 403 });
  }
  return new NextResponse(params.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim(), phone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!secret || !phone) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 262144) return new NextResponse(null, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 262144) return new NextResponse(null, { status: 413 });
  if (!validWhatsAppSignature(raw, request.headers.get('x-hub-signature-256') || '', secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const messages = incomingWhatsAppMessages(payload, phone);
  // Receipts and unsupported media must never trigger replies or Gemini calls.
  if (!messages.length) return NextResponse.json({ received: true });
  if (!process.env.WHATSAPP_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'Reply service is not configured' }, { status: 503 });
  }
  if (messages.length > 5) return NextResponse.json({ error: 'Batch exceeds processing capacity' }, { status: 503 });
  try {
    // Await delivery so Meta can retry failures; do not start untracked background work.
    const conversations = new Map<string, typeof messages>();
    for (const message of messages) conversations.set(message.from, [...(conversations.get(message.from) || []), message]);
    const results = await Promise.allSettled([...conversations.values()].map(async conversation => {
      for (const message of conversation.sort((a, b) => a.timestamp - b.timestamp)) await handleWhatsAppTriage(message);
    }));
    const failure = results.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    return NextResponse.json({ received: true });
  } catch (error) {
    // Do not log message text, phone numbers, request bodies, or access tokens.
    const code = error instanceof Error && /^(GEMINI_HTTP_\d+|WHATSAPP_HTTP_\d+|WHATSAPP_MEMORY_[A-Z_]+|WHATSAPP_CONVERSATION_BUSY|TRIAGE_[A-Z_]+)$/.test(error.message)
      ? error.message : 'WHATSAPP_REPLY_FAILED';
    console.error('WhatsApp triage:', code);
    return NextResponse.json({ error: 'Reply could not be delivered; retry later' }, { status: 503 });
  }
}
