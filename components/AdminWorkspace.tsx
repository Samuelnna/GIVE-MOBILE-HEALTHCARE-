import React, { createContext, useContext, useState } from 'react';
import AdminTraction from './AdminTraction';

export type AdminSection = 'overview' | 'traction' | 'professionals' | 'payments' | 'pharmacy' | 'clinical' | 'providers' | 'labs' | 'content' | 'careers' | 'settings';
const sections: { id: AdminSection; label: string; description: string; path: string }[] = [
  { id: 'traction', label: 'Traction', description: 'Platform growth, commercial activity, and care delivered.', path: 'M3 3v18h18 M7 15l4-5 4 3 6-8' },
  { id: 'overview', label: 'Overview', description: 'A clear view of your platform and the work that needs attention.', path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
  { id: 'professionals', label: 'Professionals', description: 'Review verification requests and manage approved professionals.', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
  { id: 'payments', label: 'Payments', description: 'Review financial transactions, payment references, and payment status.', path: 'M3 5h18v14H3z M3 10h18 M7 15h3' },
  { id: 'pharmacy', label: 'Pharmacy & orders', description: 'Manage medicine orders, prescriptions, dispatch, and drug inventory.', path: 'M8 3h8v4h4v14H4V7h4z M9 13h6 M12 10v6' },
  { id: 'clinical', label: 'Clinical records', description: 'Browse referrals, prescriptions, and hospital appointments.', path: 'M8 3h8l4 4v14H4V3z M8 11h8 M8 15h8 M8 7h3' },
  { id: 'providers', label: 'Partner network', description: 'Manage your hospitals, pharmacies, and laboratories.', path: 'M3 21h18 M5 21V7l7-4 7 4v14 M9 21v-5h6v5 M9 8h1 M14 8h1 M9 12h1 M14 12h1' },
  { id: 'labs', label: 'Laboratories', description: 'Manage laboratory requests, results, and the test directory.', path: 'M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 15h8' },
  { id: 'content', label: 'Health content', description: 'Publish and maintain health articles for your community.', path: 'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5' },
  { id: 'careers', label: 'Applications', description: 'Review career applications and follow up with candidates.', path: 'M8 6V3h8v3 M3 6h18v15H3z M3 12h18 M10 12v3h4v-3' },
  { id: 'settings', label: 'Revenue settings', description: 'Configure provider payout shares and platform commission.', path: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6' },
];
const SectionContext = createContext<AdminSection>('overview');
export function AdminPanel({ section, children }: { section: AdminSection; children: React.ReactNode }) {
  const selected = useContext(SectionContext);
  return <section hidden={selected !== section} className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">{children}</section>;
}
function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>;
}
interface Props {
  children: React.ReactNode;
  onNewPost: () => void;
  pendingProfessionals: number;
  approvedProfessionals: number;
  pendingOrders: number;
  applications: number;
  successfulPayments: number;
  receivedPayments: number;
}
export default function AdminWorkspace(props: Props) {
  const [selected, setSelected] = useState<AdminSection>('overview');
  const [search, setSearch] = useState('');
  const current = sections.find(section => section.id === selected)!;
  const counts: Partial<Record<AdminSection, number>> = { professionals: props.pendingProfessionals, pharmacy: props.pendingOrders, careers: props.applications };
  const choose = (section: AdminSection) => { setSelected(section); setSearch(''); };
  return <SectionContext.Provider value={selected}>
    <div className="py-5 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 lg:ml-[260px]">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700">GIVE Healthcare / Administration</p><h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Platform workspace</h1></div>
        <button onClick={props.onNewPost} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"><span aria-hidden="true" className="text-lg leading-none">+</span> New health article</button>
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="min-w-0 lg:w-[240px] lg:self-stretch"><aside className="min-w-0 max-w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-white shadow-sm lg:sticky lg:top-24 lg:z-30 lg:max-h-[calc(100dvh-7.5rem)] lg:w-[240px] lg:overflow-auto">
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-slate-200 focus-within:ring-2 focus-within:ring-emerald-400"><svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input aria-label="Find an admin section" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a section…" className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-300" /></label>
          <nav aria-label="Admin sections" className="flex min-w-0 max-w-full gap-1 overflow-x-auto pb-2 overscroll-x-contain lg:flex-col lg:pb-0">
            {sections.filter(section => section.label.toLowerCase().includes(search.toLowerCase())).map(section => <button key={section.id} onClick={() => choose(section.id)} aria-current={selected === section.id ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected === section.id ? 'bg-emerald-400 text-slate-950' : 'text-slate-100 hover:bg-slate-800 hover:text-white'}`}><Icon path={section.path} className="h-5 w-5 shrink-0" /><span className="whitespace-nowrap">{section.label}</span>{!!counts[section.id] && <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] ${selected === section.id ? 'bg-emerald-950/15 text-slate-950' : 'bg-white/10 text-white'}`}>{counts[section.id]}</span>}</button>)}
          </nav>
          {search && !sections.some(section => section.label.toLowerCase().includes(search.toLowerCase())) && <p className="p-3 text-sm text-slate-200">No matching section.</p>}
        </aside></div>
        <div className="min-w-0 max-w-full">
          <header className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace / {current.label}</p><h2 className="mt-2 text-2xl font-bold text-slate-900">{current.label}</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">{current.description}</p></header>
          {selected === 'overview' && <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: 'Successful payments', value: props.successfulPayments.toLocaleString(), section: 'payments' as AdminSection, detail: 'Recorded transactions' },
                { label: 'Payments received', value: `₦${props.receivedPayments.toLocaleString('en-NG')}`, section: 'payments' as AdminSection, detail: 'Successful NGN payments' },
                { label: 'Approved professionals', value: props.approvedProfessionals.toLocaleString(), section: 'professionals' as AdminSection, detail: 'View the professional directory' },
                { label: 'Orders to fulfil', value: props.pendingOrders.toLocaleString(), section: 'pharmacy' as AdminSection, detail: 'Orders not marked delivered' },
              ].map(metric => <button key={metric.label} onClick={() => choose(metric.section)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="my-3 break-all text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{metric.value}</p><p className="text-[11px] text-slate-400">{metric.detail}</p></button>)}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /><h3 className="font-bold text-slate-800">Work queues</h3></div>
              {[
                { title: 'Professional verification', count: props.pendingProfessionals, section: 'professionals' as AdminSection, detail: 'Review credentials and approval requests' },
                { title: 'Pharmacy fulfilment', count: props.pendingOrders, section: 'pharmacy' as AdminSection, detail: 'Review orders, dispatch, and delivery updates' },
                { title: 'Career applications', count: props.applications, section: 'careers' as AdminSection, detail: 'Browse applicants and update review status' },
              ].map(queue => <button key={queue.title} onClick={() => choose(queue.section)} className="flex w-full items-center gap-4 border-t border-slate-100 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{queue.count}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">{queue.title}</p><p className="mt-1 text-xs text-slate-500">{queue.detail}</p></div><span aria-hidden="true" className="text-slate-400">→</span></button>)}
            </div>
          </div>}
          {selected === 'traction' && <AdminTraction />}
          <div className="space-y-5">{props.children}</div>
        </div>
      </div>
    </div>
  </SectionContext.Provider>;
}
