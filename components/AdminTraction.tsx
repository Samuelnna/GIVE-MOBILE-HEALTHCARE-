import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { getAdminTraction } from '../app/actions/admin-traction';
import type { TractionPeriod } from '../src/traction';

type Report = NonNullable<Awaited<ReturnType<typeof getAdminTraction>>['report']>;
const number = (value: number) => value.toLocaleString('en-NG');
const naira = (value: number) => `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
export default function AdminTraction() {
  const [period, setPeriod] = useState<TractionPeriod>('all'), [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [trend, setTrend] = useState<'signups' | 'consultations' | 'triage' | 'payments'>('signups');
  const request = useRef(0);
  useEffect(() => {
    let stopped = false; const id = ++request.current;
    setLoading(true); setError('');
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Please sign in to your administrator account again.');
        const result = await getAdminTraction(session.access_token, period);
        if (stopped || id !== request.current) return;
        if (!result.success || !result.report) throw new Error(result.error || 'Traction could not be loaded.');
        setReport(result.report);
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Could not load traction.'); }
      finally { if (!stopped && id === request.current) setLoading(false); }
    })();
    return () => { stopped = true; };
  }, [period, refresh]);
  const missing = (sources: string[]) => sources.some(source => report?.missing.includes(source));
  const metrics = report ? [
    { label: 'Total signups', value: number(report.signups), help: 'Registered authentication accounts, including admin accounts.', sources: ['Auth signups'] },
    { label: 'Payment volume', value: naira(report.gross), help: 'Successful NGN payments. This is gross volume, not platform revenue.', sources: ['Payments'] },
    { label: 'Completed consultations', value: number(report.completedConsultations), help: 'Consultations booked in this period that are currently marked Completed.', sources: ['Consultations'] },
    { label: 'Completed medicine orders', value: number(report.completedOrders), help: 'Orders placed in this period that are delivered or marked received by the patient.', sources: ['Medicine orders'] },
    { label: 'Professionals', value: number(report.professionals), help: `${number(report.newProfessionals)} registered in this period. Total is a current platform snapshot.`, sources: ['Account profiles'] },
    { label: 'Active professionals', value: number(report.activeProfessionals), help: 'Professional accounts currently marked active; not an online-user count.', sources: ['Account profiles'] },
    { label: 'Patient accounts', value: number(report.lifetimePatients), help: 'Current registered patient profiles, across all time.', sources: ['Account profiles'] },
    { label: 'Paying patients', value: number(report.payingPatients), help: 'Distinct patient accounts with a successful payment in this period.', sources: ['Account profiles', 'Payments'] },
    { label: 'Repeat paying patients', value: number(report.repeatPatients), help: 'Patients with at least two successful transactions in this period.', sources: ['Account profiles', 'Payments'] },
    { label: 'Consultations booked', value: number(report.appointments), help: `${number(report.paidConsultations)} successful consultation payments; payments and bookings are counted separately.`, sources: ['Consultations', 'Payments'] },
    { label: 'Medicine orders placed', value: number(report.orders), help: `${report.orderCompletionRate}% of this period’s orders are currently completed.`, sources: ['Medicine orders'] },
    { label: 'AI triage reports', value: number(report.triageReports), help: `${number(report.triageUsers)} distinct patients with saved Triage reports. Unsaved conversations are not counted.`, sources: ['AI triage'] },
    { label: 'Medicines currently in carts', value: number(report.currentCartUnits), help: `Units currently saved across ${number(report.currentCartUsers)} carts. Current snapshot, not historical additions.`, sources: ['Current carts'] },
    { label: 'Estimated platform share', value: naira(report.estimatedShare), help: 'Estimate using current payout settings, or defaults if unavailable. Not settled revenue or profit; excludes gateway fees, operating costs, and refund adjustments.', sources: ['Payments'] },
    { label: 'Successful transactions', value: number(report.successfulPayments), help: `All currencies. ${number(report.otherCurrencyPayments)} non-NGN transactions excluded from NGN totals.`, sources: ['Payments'] },
  ] : [];
  const exportSummary = () => {
    if (!report) return;
    const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [['Metric', 'Value', 'Definition'], ...metrics.map(metric => [metric.label, missing(metric.sources) ? 'Unavailable' : metric.value, metric.help]),
      ['Reporting period', period === 'all' ? 'All time' : `Last ${period} days`, ''], ['Generated at', report.asOf, 'UTC timestamp'], ['Unavailable sources', report.missing.join('; '), '']];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `give-traction-${period}-${report.asOf.slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const trendSource = { signups: 'Auth signups', consultations: 'Consultations', triage: 'AI triage', payments: 'Payments' }[trend];
  const chartMax = Math.max(1, ...(report?.chart.map(month => month[trend]) || []));
  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-emerald-950 p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">GIVE Healthcare · Traction</p><h3 className="mt-2 text-2xl font-bold tracking-tight">The platform, in numbers.</h3><p className="mt-2 max-w-xl text-sm text-slate-300">Growth, care delivered, and commercial activity from recorded platform data.</p></div><div className="flex flex-wrap gap-2"><button disabled={loading} onClick={() => setRefresh(value => value + 1)} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold disabled:opacity-50">Refresh</button><button disabled={loading || !report || !!error} onClick={exportSummary} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Export summary</button></div></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-xl bg-white/10 p-1" aria-label="Reporting period">{(['all', '30', '90'] as const).map(value => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${period === value ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-white/10'}`}>{value === 'all' ? 'All time' : `Last ${value} days`}</button>)}</div><p className="text-xs text-slate-300">{loading ? 'Loading platform data…' : report ? `Updated ${new Date(report.asOf).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} WAT` : 'No snapshot loaded'}</p></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Calculating traction…</div> : report && !error && <>
      {!!report.missing.length && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Unavailable metrics: {report.missing.join(', ')}. Unavailable sources are not represented as zero.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric, index) => <article key={metric.label} className={`rounded-2xl border bg-white p-5 ${index < 4 ? 'border-emerald-200 shadow-sm' : 'border-slate-200'}`}><h4 className="text-xs font-semibold text-slate-500">{metric.label}</h4><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">{missing(metric.sources) ? 'Unavailable' : metric.value}</p><p className="mt-3 text-xs leading-relaxed text-slate-500">{metric.help}</p></article>)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-800">Growth over time</h3><p className="mt-1 text-xs text-slate-500">Last six calendar months, filtered to your selected period. WAT dates.</p></div><select aria-label="Trend metric" value={trend} onChange={event => setTrend(event.target.value as typeof trend)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700"><option value="signups">Signups</option><option value="consultations">Consultations booked</option><option value="triage">AI triage reports</option><option value="payments">Payment volume (NGN)</option></select></div>
        {missing([trendSource]) ? <p className="py-10 text-center text-slate-500">This data source is unavailable.</p> : <div className="mt-6 overflow-x-auto"><div className="grid min-w-[480px] grid-cols-6 gap-4">{report.chart.map(month => <div key={month.label} className="text-center"><p className="mb-2 text-xs font-bold text-slate-700">{trend === 'payments' ? naira(month[trend]) : number(month[trend])}</p><div className="flex h-36 items-end justify-center rounded-lg bg-slate-50"><div className="w-8 rounded-t-lg bg-emerald-500 sm:w-10" style={{ height: `${month[trend] ? Math.max(3, month[trend] / chartMax * 100) : 0}%` }} /></div><p className="mt-3 text-xs text-slate-500">{month.label}</p></div>)}</div></div>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="font-bold text-slate-800">Where payment volume comes from</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="pb-3">Service</th><th className="pb-3">Transactions</th><th className="pb-3 text-right">Gross NGN volume</th></tr></thead><tbody className="divide-y divide-slate-100">{!missing(['Payments']) && report.byType.map(row => <tr key={row.type}><td className="py-3 capitalize text-slate-700">{row.type.replace(/_/g, ' ')}</td><td className="py-3 text-slate-500">{number(row.count)}</td><td className="py-3 text-right font-semibold text-slate-800">{naira(row.amount)}</td></tr>)}</tbody></table>{!report.byType.length && <p className="py-5 text-sm text-slate-500">{missing(['Payments']) ? 'Payment data is unavailable.' : 'No successful NGN payments in this period.'}</p>}</div></div>
      <p className="text-xs leading-relaxed text-slate-500">Period filters use signup, booking, order, payment, and saved-report creation dates. Completion figures show the current status of records created in the period, not the date they were completed. Professionals, patient profiles, and current carts are snapshots. Financial figures are operational metrics, not audited financial statements; historical commission changes and refunds are not reconstructed.</p>
    </>}
  </div>;
}
