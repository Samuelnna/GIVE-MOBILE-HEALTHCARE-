'use client';

import React, { FormEvent, useState } from 'react';
import Footer from '../../components/Footer';
import { supabase } from '../../src/supabaseClient';

const specialties = ['Medical Doctor', 'Nurse', 'Pharmacist', 'Lab Scientist'];

const roleDetails = [
  {
    role: 'Medical Doctor',
    description: 'Provide online consultations, assess symptoms, explain care options, and guide patients to hospitals or laboratories when in-person care is needed.',
  },
  {
    role: 'Nurse',
    description: 'Support patient education, follow-up, health monitoring, and care navigation while helping patients feel heard throughout their care journey.',
  },
  {
    role: 'Pharmacist',
    description: 'Support safe medication use, answer medicine-related questions, review prescriptions, and help patients understand adherence and refills.',
  },
  {
    role: 'Lab Scientist',
    description: 'Help patients access the right tests, support digital result workflows, and contribute reliable laboratory insight to coordinated clinical care.',
  },
];

export default function CareersPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    hospital: '',
    digitalHealthcareExperience: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('career_applications').insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      specialty: form.specialty,
      hospital: form.hospital.trim() || null,
      experienced_in_digital_healthcare: form.digitalHealthcareExperience === 'Yes',
    });

    if (insertError) {
      setError('We could not submit your application right now. Please try again or contact support.');
    } else {
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', specialty: '', hospital: '', digitalHealthcareExperience: '' });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f5faf8] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/mobiledoclogo.jpeg" alt="MobileDoc" className="h-11 w-11 rounded-xl object-contain" />
            <span className="text-lg font-black tracking-tight text-slate-900">MobileDoc</span>
          </a>
          <nav className="flex items-center gap-4 text-sm font-bold">
            <a href="/about" className="text-slate-500 hover:text-emerald-700">About</a>
            <a href="/" className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-emerald-800">Open app</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-700 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-emerald-200">Careers at MobileDoc</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Help make quality care easier to reach.</h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-emerald-50/90 sm:text-xl">
              Join a growing digital healthcare network where qualified professionals can consult patients online and help people get the right care, wherever they are.
            </p>
            <a href="#application" className="mt-9 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-emerald-900 shadow-lg hover:bg-emerald-50">Apply to join</a>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
          <div className="lg:pt-8">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">A better way to practise</p>
            <h2 className="text-3xl font-black leading-tight text-slate-900">Bring your expertise to patients who need it.</h2>
            <p className="mt-5 leading-relaxed text-slate-600">MobileDoc connects patients with healthcare professionals through secure digital consultations, messaging, referrals, and coordinated follow-up.</p>
            <div className="mt-8 space-y-3">
              {roleDetails.map((item) => (
                <article key={item.role} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-700">+</span>
                    <h3 className="font-black text-slate-900">{item.role}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div id="application" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Professional application</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Tell us about yourself</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">We will review your details and contact you about the next step.</p>
            </div>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl font-black text-white">✓</div>
                <h3 className="mt-4 text-xl font-black text-emerald-950">Application received</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800">Thank you for your interest in MobileDoc. Our team will review your application and be in touch.</p>
                <button type="button" onClick={() => setSubmitted(false)} className="mt-5 text-sm font-black text-emerald-700 underline">Submit another application</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Full name</span><input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="Your full name" /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Email address</span><input required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="you@example.com" /></label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Contact phone number</span><input required type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="0800 000 0000" /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Specialty</span><select required value={form.specialty} onChange={(e) => updateField('specialty', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"><option value="">Select your role</option>{specialties.map((specialty) => <option key={specialty}>{specialty}</option>)}</select></label>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Hospital or organisation <span className="font-normal text-slate-400">(optional)</span></span><input value={form.hospital} onChange={(e) => updateField('hospital', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="Where do you currently practise?" /></label>
                <fieldset><legend className="mb-3 text-sm font-bold text-slate-700">Are you experienced in digital healthcare?</legend><div className="flex gap-3"><label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${form.digitalHealthcareExperience === 'Yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><input required type="radio" name="digitalHealthcareExperience" value="Yes" checked={form.digitalHealthcareExperience === 'Yes'} onChange={(e) => updateField('digitalHealthcareExperience', e.target.value)} className="accent-emerald-600" />Yes</label><label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${form.digitalHealthcareExperience === 'No' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><input required type="radio" name="digitalHealthcareExperience" value="No" checked={form.digitalHealthcareExperience === 'No'} onChange={(e) => updateField('digitalHealthcareExperience', e.target.value)} className="accent-emerald-600" />No</label></div></fieldset>
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Sending application...' : 'Send application'}</button>
                <p className="text-center text-xs leading-relaxed text-slate-400">By submitting, you agree that MobileDoc may contact you about this opportunity.</p>
              </form>
            )}
          </div>
        </section>

        <section className="border-y border-emerald-100 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8 lg:py-18">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">After you apply</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900">A simple, respectful review process.</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-slate-600">Your application helps us understand your background and the kind of care you can provide. We review every submission and contact suitable applicants about the next step.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f5faf8] p-5">
                <span className="text-sm font-black text-emerald-700">01</span>
                <h3 className="mt-3 font-black text-slate-900">Application review</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Our team checks your professional details and preferred role.</p>
              </div>
              <div className="rounded-2xl bg-[#f5faf8] p-5">
                <span className="text-sm font-black text-emerald-700">02</span>
                <h3 className="mt-3 font-black text-slate-900">Introductory contact</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">We reach out by email or phone to learn more about your availability.</p>
              </div>
              <div className="rounded-2xl bg-[#f5faf8] p-5">
                <span className="text-sm font-black text-emerald-700">03</span>
                <h3 className="mt-3 font-black text-slate-900">Onboarding</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Selected professionals continue through verification and platform orientation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-emerald-950 px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Before you submit</p>
            <div className="mt-4 grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black">Come as you are, practise with care.</h2>
                <p className="mt-3 leading-relaxed text-emerald-50/75">You do not need previous digital-health experience to express interest. We value sound professional judgment, clear communication, patient respect, and a willingness to learn.</p>
              </div>
              <div className="space-y-3 text-sm font-semibold text-emerald-50/90">
                <p><span className="mr-2 text-emerald-300">✓</span>Use accurate contact details so our team can reach you.</p>
                <p><span className="mr-2 text-emerald-300">✓</span>Select the role that best matches your professional background.</p>
                <p><span className="mr-2 text-emerald-300">✓</span>Keep your professional credentials available for the verification stage.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
