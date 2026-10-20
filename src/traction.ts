export type TractionPeriod = 'all' | '30' | '90';
type Row = Record<string, any>;
export interface TractionInput {
  accounts: Row[]; profiles: Row[]; payments: Row[]; appointments: Row[];
  orders: Row[]; cart: Row[]; triage: Row[];
  rates: Row; missing: string[];
}
export function summarizeTraction(input: TractionInput, period: TractionPeriod, now = new Date()) {
  const since = period === 'all' ? -Infinity : now.getTime() - Number(period) * 86400000;
  const inPeriod = (row: Row) => { const time = Date.parse(row.created_at); return time >= since && time <= now.getTime(); };
  const accounts = input.accounts.filter(inPeriod), professionals = input.profiles.filter(p => p.user_type === 'professional');
  const patients = new Set(input.profiles.filter(p => p.user_type === 'patient').map(p => p.id));
  const payments = input.payments.filter(p => ['successful', 'completed'].includes(String(p.status).toLowerCase()) && inPeriod(p));
  const ngn = payments.filter(p => !p.currency || p.currency === 'NGN');
  const appointments = input.appointments.filter(inPeriod), orders = input.orders.filter(inPeriod);
  const triage = input.triage.filter(row => String(row.record_type).toLowerCase() === 'triage' && inPeriod(row));
  const payingPatients = new Set(payments.filter(p => patients.has(p.user_id)).map(p => p.user_id));
  const frequency = new Map<string, number>();
  payments.forEach(p => { if (patients.has(p.user_id)) frequency.set(p.user_id, (frequency.get(p.user_id) || 0) + 1); });
  const gross = ngn.reduce((total, row) => total + Number(row.amount || 0), 0);
  const rateKeys: Record<string, [string, number]> = {
    doctor_consultation: ['doctor_share', .7], professional_consultation: ['doctor_share', .7],
    pharmacy_order: ['pharmacy_share', .9], lab_test: ['lab_share', .8], hospital_appointment: ['hospital_share', .85],
  };
  let estimatedShare = 0, unclassifiedVolume = 0;
  for (const payment of ngn) {
    const config = rateKeys[payment.payment_type];
    if (!config) { unclassifiedVolume += Number(payment.amount || 0); continue; }
    const rate = Number(input.rates[config[0]] ?? config[1]);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) { unclassifiedVolume += Number(payment.amount || 0); continue; }
    estimatedShare += Number(payment.amount || 0) * (1 - rate);
  }
  const completedOrders = orders.filter(o => String(o.fulfillment_status).toLowerCase() === 'delivered' || o.receipt_status === 'received');
  const byType = [...new Set(ngn.map(p => String(p.payment_type)))].map(type => ({ type, count: ngn.filter(p => p.payment_type === type).length,
    amount: ngn.filter(p => p.payment_type === type).reduce((total, p) => total + Number(p.amount || 0), 0) })).sort((a, b) => b.amount - a.amount);
  const monthKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit' }).format(date);
  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 15));
    const key = monthKey(date);
    const match = (row: Row) => Number.isFinite(Date.parse(row.created_at)) && monthKey(new Date(row.created_at)) === key;
    return { label: new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', month: 'short', year: '2-digit' }).format(date),
      signups: accounts.filter(match).length, consultations: appointments.filter(match).length,
      triage: triage.filter(match).length, payments: ngn.filter(match).reduce((total, p) => total + Number(p.amount || 0), 0) };
  });
  return {
    asOf: now.toISOString(), period, missing: input.missing,
    signups: accounts.length, lifetimePatients: patients.size, professionals: professionals.length,
    activeProfessionals: professionals.filter(p => p.status === 'active').length,
    newProfessionals: professionals.filter(inPeriod).length,
    gross, estimatedShare, unclassifiedVolume, successfulPayments: payments.length,
    otherCurrencyPayments: payments.length - ngn.length,
    payingPatients: payingPatients.size, repeatPatients: [...frequency.values()].filter(count => count > 1).length,
    appointments: appointments.length, completedConsultations: appointments.filter(a => a.status === 'Completed').length,
    pendingConsultations: appointments.filter(a => a.status === 'Pending').length,
    paidConsultations: payments.filter(p => ['doctor_consultation', 'professional_consultation'].includes(p.payment_type)).length,
    orders: orders.length, completedOrders: completedOrders.length,
    orderCompletionRate: orders.length ? Math.round(completedOrders.length / orders.length * 100) : 0,
    triageReports: triage.length, triageUsers: new Set(triage.map(t => t.patient_id).filter(Boolean)).size,
    currentCartUnits: input.cart.reduce((total, c) => total + Math.max(0, Number(c.quantity || 0)), 0),
    currentCartUsers: new Set(input.cart.map(c => c.user_id).filter(Boolean)).size,
    byType, chart,
  };
}
