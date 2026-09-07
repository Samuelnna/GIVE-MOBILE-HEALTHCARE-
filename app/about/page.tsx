import React from 'react';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'About MobileDoc | Mobile Healthcare International',
  description:
    'MobileDoc is the digital healthcare product of Mobile Healthcare International LTD — connecting patients across Nigeria to verified clinicians through teleconsultation, AI triage, and prescription care.',
};

const capabilities = [
  {
    title: 'Two-way teleconsultation',
    body: 'Patients connect with verified practitioners over high-definition video, audio, or in-platform messaging — so a consult can happen without a missed hospital visit.',
  },
  {
    title: 'AI-driven clinical triage',
    body: 'An intelligent first pass reads logged symptoms and routes the patient toward the right specialist — for example matching diabetic parameters with endocrinology — before a consult is booked.',
  },
  {
    title: 'Multilingual access',
    body: 'A translation layer helps patients describe symptoms in regional dialects with confidence, so language is not a barrier to being understood by a clinician.',
  },
  {
    title: 'Prescription adherence',
    body: 'Digital prescriptions can be received, purchased, and tracked, with automated reminders so treatment does not drop off after the consult ends.',
  },
];

const leaders = [
  {
    name: 'Dr Nnaji Samuel Ebube',
    role: 'Founder / President',
    org: 'Mobile Healthcare International',
    copy: 'Sets the institutional direction for Mobile Healthcare International and the MobileDoc product: expanding clinical access across Africa through secure digital care pipelines.',
  },
  {
    name: 'Dr Benjamin Odusanya',
    role: 'Chief Executive & Clinical Officer (CECO)',
    org: 'Clinical governance',
    copy: 'Heads state medical board credentialing, clinician verification, and the legal bounds of telemedicine workflow — so every practitioner on the network is accountable and every consult stays within professional rules.',
  },
  {
    name: 'Jubril Mahmood',
    role: 'Head of Social Media & Physical Marketing',
    org: 'Marketing operations',
    copy: 'Directs regional outreach that brings telemedicine closer to urban and rural enterprise cells — so MobileDoc is not only an app, but a presence people can actually find.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-800 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/mobiledoclogo.jpeg" alt="MobileDoc" className="h-12 w-12 rounded-xl object-contain bg-white" />
            <span className="font-black text-lg tracking-tight">MobileDoc</span>
          </a>
          <nav className="flex items-center gap-5 text-sm font-bold">
            <a href="/about" className="text-emerald-700">About</a>
            <a href="/" className="text-slate-500 hover:text-slate-900">Open app</a>
            <a href="/admin" className="text-slate-400 hover:text-slate-700 hidden sm:inline">Admin</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-800 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <p className="text-emerald-200 text-xs font-black uppercase tracking-[0.25em] mb-4">A product of Mobile Healthcare International LTD</p>
            <h1 className="text-3xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[1.05]">
              Healthcare everywhere you go.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-emerald-50/90 max-w-2xl leading-relaxed font-medium">
              MobileDoc is the clinical product of Mobile Healthcare International LTD. We replace geographic and language barriers with secure, instantaneous digital healthcare pipelines — from first triage to medication in hand.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="/" className="px-6 py-3 rounded-2xl bg-white text-emerald-900 font-black text-sm uppercase tracking-wide hover:bg-emerald-50 transition-colors">
                Enter MobileDoc
              </a>
              <a href="#contact" className="px-6 py-3 rounded-2xl border border-white/25 text-white font-black text-sm uppercase tracking-wide hover:bg-white/10 transition-colors">
                Contact the team
              </a>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-3">The mission</p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Democratize clinical access across Africa.</h2>
            <p className="mt-4 text-slate-600 leading-relaxed font-medium">
              Too many people still wait on distance, language, and overcrowded outpatient queues. MobileDoc is built so a patient in Enugu, Lagos, Abuja, or a rural cell can reach a verified clinician, understand the advice, and complete treatment — without the journey becoming the barrier.
            </p>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <p className="text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-3">The why</p>
            <p className="text-slate-700 leading-relaxed font-medium">
              Nigeria faces a critical healthcare gap: a roughly <span className="font-black text-slate-900">1:2,000 doctor-to-patient</span> deficit, and about <span className="font-black text-slate-900">75% of individuals miss physical hospital appointments</span>. Missed visits stall diagnosis, break medication plans, and deepen healthcare poverty.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed font-medium">
              MobileDoc is the bridge: virtual consultations, labs, hospital scheduling, and medication delivery in one verified network — so care is completed, not abandoned.
            </p>
          </div>
        </section>

        <section className="bg-white border-y border-slate-100 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-3">What MobileDoc does</p>
            <h2 className="text-3xl font-black text-slate-900 mb-10">The care pipeline, end to end.</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {capabilities.map((item) => (
                <article key={item.title} className="rounded-[1.75rem] border border-slate-100 bg-[#FAFBFC] p-7">
                  <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">{item.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 text-slate-500 text-sm font-medium max-w-3xl">
              Around that core, patients can book hospitals and labs, keep records, and pay securely. Practitioners are credentialed before they practise on the platform. That is how MobileDoc stays a clinical product, not a generic chat app.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-3">Leadership</p>
          <h2 className="text-3xl font-black text-slate-900 mb-10">The people accountable for the network.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {leaders.map((person) => (
              <article key={person.name} className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-7 flex flex-col">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-800 font-black text-lg flex items-center justify-center mb-5">
                  {person.name.split(' ').filter((p) => p !== 'Dr').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <h3 className="text-lg font-black text-slate-900">{person.name}</h3>
                <p className="text-emerald-700 font-bold text-sm mt-1">{person.role}</p>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{person.org}</p>
                <p className="text-slate-600 text-sm leading-relaxed font-medium mt-4">{person.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
            <div>
              <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Where we operate</p>
              <h2 className="text-3xl font-black mb-6">Nigeria first, digital hubs nationwide.</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-emerald-200 text-xs font-black uppercase tracking-widest">Primary corporate HQ</p>
                  <p className="font-bold text-lg mt-1">No 5 Amechi Awkunanaw, Enugu State, Nigeria</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-black uppercase tracking-widest">Regional operational cells</p>
                  <p className="font-bold text-lg mt-1">Lagos and Abuja Digital Logistics Hubs, Nigeria</p>
                </div>
              </div>
            </div>
            <div id="contact" className="bg-white/5 border border-white/10 rounded-[1.75rem] p-8">
              <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Reach us</p>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <p className="text-white/50 text-xs font-black uppercase tracking-widest">Initiative</p>
                  <a className="text-white hover:text-emerald-200 break-all" href="mailto:mobilehealthcareinitiative@gmail.com">mobilehealthcareinitiative@gmail.com</a>
                </li>
                <li>
                  <p className="text-white/50 text-xs font-black uppercase tracking-widest">Administration</p>
                  <a className="text-white hover:text-emerald-200 break-all" href="mailto:mobilehealthadmin@gmail.com">mobilehealthadmin@gmail.com</a>
                </li>
                <li>
                  <p className="text-white/50 text-xs font-black uppercase tracking-widest">Web</p>
                  <a className="text-white hover:text-emerald-200" href="https://mobiledoc247.com" target="_blank" rel="noreferrer">mobiledoc247.com</a>
                </li>
              </ul>
              <p className="mt-8 text-white/60 text-sm leading-relaxed">
                For clinician onboarding and credentialing questions, write the administration desk. For partnerships and community outreach, write the initiative desk.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
