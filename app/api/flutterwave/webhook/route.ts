import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { confirmCheckout, paymentClient } from '../../../lib/consultation-checkout';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  const received = request.headers.get('verif-hash') || '';
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  const a = Buffer.from(secret), b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let event: any;
  try { event = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (event.event !== 'charge.completed') return NextResponse.json({ received: true });
  const reference = event.data?.tx_ref;
  if (typeof reference !== 'string' || !/^MDOC-[A-Za-z0-9-]+$/.test(reference)) return NextResponse.json({ received: true });
  try {
    const { data, error } = await paymentClient().from('payments').select('details').eq('tx_ref', reference).maybeSingle();
    if (error) throw error;
    if (data?.details?.checkout_version !== 2) return NextResponse.json({ received: true });
    if (event.data?.status !== 'successful') return NextResponse.json({ received: true });
    await confirmCheckout(reference, undefined, String(event.data?.id || ''));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Consultation webhook confirmation failed:', error);
    return NextResponse.json({ error: 'Retry confirmation' }, { status: 503 });
  }
}
