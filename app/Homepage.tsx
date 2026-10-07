'use client';

import React, { useState } from 'react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { FEATURES } from '../src/features';

interface HomepageProps {
  onGetStarted: () => void;
}

const services = [
  { label: 'AI triage', detail: 'Understand your next step before booking care.' },
  { label: 'Audio and video consultations', detail: 'Speak with healthcare professionals remotely.' },
  ...(FEATURES.hospitals
    ? [{ label: 'Hospitals', detail: 'Find healthcare facilities and their services.' }]
    : []),
  ...(FEATURES.labs
    ? [{ label: 'Labs and tests', detail: 'Book lab tests and keep results in one place.' }]
    : []),
  { label: 'Prescriptions and pharmacy', detail: 'Move from clinical advice to medication access.' },
  { label: 'Health news & articles', detail: 'Explore current health headlines and practical wellness reading.' },
];

export default function Homepage({ onGetStarted }: HomepageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5faf8] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/mobiledoclogo.jpeg" alt="MobileDoc" className="h-11 w-11 rounded-xl object-contain" />
            <span className="text-lg font-black tracking-tight text-slate-950">MobileDoc</span>
          </a>
          <nav className="hidden items-center gap-4 text-sm font-bold sm:flex">
            <a href="/about" className="hidden text-slate-500 hover:text-emerald-700 sm:inline">About</a>
            <a href="/careers" className="hidden text-slate-500 hover:text-emerald-700 sm:inline">Careers</a>
          </nav>
          <div className="relative sm:hidden">
            <button
              type="button"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <span className="sr-only">Menu</span>
              <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-2 text-sm font-bold shadow-xl shadow-slate-900/10">
                <a href="/about" onClick={() => setIsMenuOpen(false)} className="block rounded-xl px-4 py-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">About</a>
                <a href="/careers" onClick={() => setIsMenuOpen(false)} className="block rounded-xl px-4 py-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">Careers</a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-700 text-white">
          <div className="absolute -right-24 -top-24 h-80 w-80 animate-pulse rounded-full border-[40px] border-white/10 [animation-duration:7s]" />
          <div className="absolute bottom-[-8rem] left-1/2 h-72 w-72 animate-pulse rounded-full border-[28px] border-emerald-300/10 [animation-delay:1.5s] [animation-duration:9s]" />
          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <div className="flex animate-fade-in-up flex-col items-center">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-emerald-200">Digital healthcare, connected</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">Care that moves with you.</h1>
              <p className="mt-6 max-w-2xl animate-fade-in-up text-lg font-medium leading-relaxed text-emerald-50/90 [animation-delay:150ms] sm:text-xl">From your first health question to professional consultations and pharmacy support, MobileDoc brings the next step closer.</p>
              <div className="mt-9 flex animate-fade-in-up justify-center [animation-delay:300ms]">
                <button onClick={onGetStarted} className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wide text-emerald-950 shadow-xl transition hover:bg-emerald-50">Get started</button>
              </div>
              <p className="mt-5 animate-fade-in-up text-xs font-semibold text-emerald-100/70 [animation-delay:450ms]">For patients and healthcare professionals.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">The care network</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">Everything you need to keep care moving.</h2>
            <p className="mt-4 leading-relaxed text-slate-600">MobileDoc connects patients with healthcare professionals, helping important steps stay connected from consultation to follow-up.</p>
          </div>
          <div
            className="mt-10 grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' }}
          >
            {services.map((service, index) => (
              <article key={service.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="text-sm font-black text-emerald-700">0{index + 1}</span>
                <h3 className="mt-5 text-lg font-black text-slate-950">{service.label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-emerald-100 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Built for real healthcare</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">A patient should not have to coordinate everything alone.</h2>
              <p className="mt-5 max-w-xl leading-relaxed text-slate-600">Use one secure platform to find care, communicate with professionals, manage appointments, view health records, and stay connected to the services that support your treatment.</p>
              <button onClick={onGetStarted} className="mt-7 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800">Get started</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f5faf8] p-6"><p className="text-3xl font-black text-emerald-700">01</p><h3 className="mt-3 font-black text-slate-900">Start with your need</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Use triage or browse the care service that fits your situation.</p></div>
              <div className="rounded-2xl bg-slate-950 p-6 text-white"><p className="text-3xl font-black text-emerald-300">02</p><h3 className="mt-3 font-black">Reach the right service</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">Connect with a professional or schedule the next clinical step.</p></div>
              <div className="rounded-2xl bg-slate-100 p-6"><p className="text-3xl font-black text-slate-700">03</p><h3 className="mt-3 font-black text-slate-900">Keep your record</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Keep appointments, reports, referrals, and prescriptions together.</p></div>
              <div className="rounded-2xl bg-emerald-700 p-6 text-white"><p className="text-3xl font-black text-emerald-200">04</p><h3 className="mt-3 font-black">Continue care</h3><p className="mt-2 text-sm leading-relaxed text-emerald-50/80">Follow up with less friction and more context.</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-[2rem] bg-emerald-950 px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Ready when you are</p><h2 className="mt-3 text-3xl font-black">Take the next step toward better access.</h2><p className="mt-3 max-w-xl leading-relaxed text-emerald-50/75">Create your account or sign in to begin using the MobileDoc care network.</p></div>
            <button onClick={onGetStarted} className="mt-7 shrink-0 rounded-xl bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wide text-emerald-950 hover:bg-emerald-50 lg:mt-0">Get started</button>
          </div>
        </section>
      </main>
      <Footer />
      <Chatbot onGetStarted={onGetStarted} />
    </div>
  );
}
