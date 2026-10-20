import React from 'react';
import Footer from './Footer';

export default function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-700">
    <header className="bg-white border-b px-6 py-5"><a href="/" className="text-xl font-bold text-sky-700">MobileDoc</a></header>
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-3">{title}</h1>
      <p className="text-sm mb-8">Mobile Healthcare International LTD · Updated 20 October 2026</p>
      <nav aria-label="Privacy and account" className="flex flex-wrap gap-5 text-sky-700 underline mb-10">
        <a href="/privacy-policy">Privacy policy</a><a href="/data-use">Data use</a><a href="/delete-account">Delete account</a>
      </nav>
      <div className="space-y-7 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_a]:text-sky-700 [&_a]:underline">{children}</div>
    </main><Footer />
  </div>;
}
