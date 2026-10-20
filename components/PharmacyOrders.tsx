import React, { useEffect, useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { getMyPharmacyOrders, confirmPharmacyOrderReceipt } from '../app/actions/pharmacy-orders';

const money = (value: unknown) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
export default function PharmacyOrders() {
  const [orders, setOrders] = useState<any[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again to view your orders.');
    return session.access_token;
  };
  useEffect(() => {
    let stopped = false, fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await getMyPharmacyOrders(await getToken());
        if (stopped) return;
        if (!result.success) throw new Error(result.error);
        setOrders(result.orders || []); setError('');
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Could not load orders.'); }
      finally { fetching = false; if (!stopped) setLoading(false); }
    };
    void load();
    const channel = supabase.channel('my_pharmacy_order_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_order_items' }, load).subscribe();
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    window.addEventListener('focus', load);
    return () => { stopped = true; clearInterval(poll); window.removeEventListener('focus', load); void supabase.removeChannel(channel); };
  }, []);
  const save = async (id: string, status: 'received' | 'not_received') => {
    if (saving) return;
    const choice = { id, status }; setSaving(choice.id); setError(''); setNotice('');
    try {
      const result = await confirmPharmacyOrderReceipt(await getToken(), choice.id, choice.status);
      if (!result.success) throw new Error(result.error);
      setOrders(current => current.map(order => order.id === choice.id ? { ...order, ...result.order } : order));
      setNotice(choice.status === 'received' ? 'Order updated: drug received.' : 'Your not-received report is saved and visible to the admin team.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save receipt status.'); }
    finally { setSaving(null); }
  };
  return <section className="space-y-5">
    <div><h2 className="text-xl font-bold text-slate-800">My orders</h2><p className="text-sm text-slate-500 mt-1">Track your medicines and let us know when they arrive. Payment and receipt are shown separately.</p></div>
    {loading && <p role="status" className="text-slate-500">Loading orders…</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {!loading && !error && orders.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No orders yet. Your medicine purchases will appear here after checkout.</div>}
    {orders.map(order => {
      const fulfillment = String(order.fulfillment_status || 'pending').toLowerCase();
      const pickup = String(order.delivery_method || '').toLowerCase().includes('pickup');
      const fulfilled = fulfillment === 'delivered';
      const receipt = order.receipt_status || 'awaiting_confirmation';
      const receiptEnabled = typeof order.receipt_status === 'string';
      const paid = String(order.status || '').toLowerCase() === 'paid';
      const progress = fulfilled || receipt === 'received' ? 2 : ['dispatched', 'ready_for_pickup', 'ready'].includes(fulfillment) ? 1 : 0;
      const stages = ['Order placed', pickup ? 'Ready for pickup' : 'With dispatch', pickup ? 'Collected' : 'Delivered'];
      return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-slate-800">Order #{String(order.id).slice(0, 8).toUpperCase()}</h3><p className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleString()}</p></div><div className="text-right"><p className="font-bold text-lg text-slate-800">{money(order.total_amount)}</p><span className={`text-xs font-bold ${paid ? 'text-emerald-700' : 'text-slate-500'}`}>{paid ? 'Paid' : `Payment / order status: ${order.status || 'Not available'}`}</span></div></div>
        <ol className="grid grid-cols-3 gap-2" aria-label="Order progress">{stages.map((stage, index) => <li key={stage} aria-current={index === progress ? 'step' : undefined} className={`border-t-4 pt-2 text-xs font-bold ${index <= progress ? 'border-emerald-500 text-emerald-800' : 'border-slate-100 text-slate-400'}`}>{index < progress ? '✓ ' : ''}{stage}</li>)}</ol>
        <p className="text-sm text-slate-600">{order.delivery_method || 'Delivery / pickup'} · {pickup ? order.pickup_location || 'Pickup location to be confirmed' : order.delivery_address || 'Delivery address not provided'}</p>
        <ul className="divide-y divide-slate-100">{(order.items || []).map((item: any) => <li key={item.id} className="py-2 flex justify-between gap-3 text-sm"><span className="text-slate-700">{item.medication?.name || 'Medicine'} × {item.quantity}</span><span className="text-slate-500">{money(Number(item.price_at_time) * Number(item.quantity))}</span></li>)}</ul>
        {!order.items?.length && <p className="text-sm text-amber-700">Order items are not available. Contact support with your order ID; do not pay again.</p>}
        <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="text-slate-600">Pharmacy update: <strong className="capitalize">{fulfillment === 'dispatched' ? (pickup ? 'Ready for pickup' : 'With dispatch') : fulfillment.replace(/_/g, ' ')}</strong></p><p className={`mt-1 font-bold ${receipt === 'not_received' ? 'text-amber-800' : receipt === 'received' ? 'text-emerald-700' : 'text-slate-600'}`}>{receipt === 'received' ? '✓ Drug received' : receipt === 'not_received' ? 'You reported: not received' : 'Not marked as received yet'}</p></div>
        {receiptEnabled ? <div className="flex flex-wrap gap-3">
          <button disabled={saving !== null || receipt === 'received'} onClick={() => void save(order.id, 'received')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving === order.id ? 'Saving…' : 'Received drug'}</button>
          <button disabled={saving !== null || receipt === 'not_received'} onClick={() => void save(order.id, 'not_received')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Not received</button>
        </div> : <p className="text-xs text-slate-500">Order updates will be available when order tracking is enabled.</p>}
      </article>;
    })}
  </section>;
}
