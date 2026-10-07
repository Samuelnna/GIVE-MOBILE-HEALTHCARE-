
import React, { useEffect, useRef, useState } from 'react';
import type { Section } from '../types';
import { ChatIcon, CloseIcon, SendIcon } from './IconComponents';
import { FEATURES } from '../src/features';

type GuideAction =
  | { kind: 'navigate'; label: string; section: Section }
  | { kind: 'triage'; label: string }
  | { kind: 'signup'; label: string }
  | { kind: 'whatsapp'; label: string };

interface GuideMessage {
  id: number;
  role: 'guide' | 'user';
  text: string;
  actions?: GuideAction[];
}

interface ChatbotProps {
  isAuthenticated?: boolean;
  onNavigate?: (section: Section) => void;
  onGetStarted?: () => void;
  onOpenTriage?: () => void;
}

const WHATSAPP_URL = 'https://wa.me/2349015581259?text=Hello%20MobileDoc%2C%20I%20need%20help.';

const Chatbot: React.FC<ChatbotProps> = ({
  isAuthenticated = false,
  onNavigate,
  onGetStarted,
  onOpenTriage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);

  const makeMessage = (role: GuideMessage['role'], text: string, actions?: GuideAction[]): GuideMessage => ({
    id: nextMessageId.current++,
    role,
    text,
    actions,
  });

  const serviceAction = (section: Section, label: string): GuideAction => (
    isAuthenticated
      ? { kind: 'navigate', label, section }
      : { kind: 'signup', label: `Sign in to ${label.toLowerCase()}` }
  );

  const getReply = (rawText: string) => {
    const text = rawText.toLowerCase();
    const whatsapp: GuideAction = { kind: 'whatsapp', label: 'Talk to MobileDoc on WhatsApp' };
    const triage: GuideAction = isAuthenticated && onOpenTriage
      ? { kind: 'triage', label: 'Open AI triage' }
      : { kind: 'signup', label: 'Sign in to use AI triage' };

    if (/(chest pain|can'?t breathe|cannot breathe|difficulty breathing|heavy bleeding|unconscious|stroke|seizure|overdose|suicid)/.test(text)) {
      return makeMessage('guide', 'This could need urgent in-person care. I can’t assess emergencies here. Call your local emergency service or go to the nearest emergency department now; don’t wait for chat or WhatsApp.');
    }
    if (/(triage|symptom|sick|ill|pain|fever|rash|cough|headache|sore|feel unwell|what should i do)/.test(text)) {
      return makeMessage('guide', 'For non-emergency symptoms, start with the symptom triage to get a suggested next step. If symptoms are severe or worsening, seek urgent in-person care. I can’t diagnose you here.', [
        triage,
        serviceAction('Doctors', 'Find a doctor'),
      ]);
    }
    if (/(drug|medicine|medication|pharmacy|prescription|refill|buy.*pill|buy.*drug)/.test(text)) {
      return makeMessage('guide', 'If a clinician has prescribed a medicine, you can check the pharmacy for availability. I can’t choose a drug or dose for symptoms; ask a doctor or pharmacist if you’re unsure.', [
        serviceAction('Pharmacy', 'Open pharmacy'),
        serviceAction('Doctors', 'Ask a doctor'),
      ]);
    }
    if (/(doctor|physician|specialist|nurse|pharmacist|professional|consult|appointment|book|message|chat)/.test(text)) {
      return makeMessage('guide', 'You can browse healthcare professionals and book consultations with doctors. Nurses, pharmacists, and other listed professionals can be contacted through Messaging.', [
        serviceAction('Doctors', 'Browse professionals'),
        serviceAction('Appointments', 'View appointments'),
      ]);
    }
    if (/(lab|test|blood|scan|result)/.test(text)) {
      if (!FEATURES.labs) {
        return makeMessage('guide', 'Laboratory booking is not currently available in MobileDoc. Please contact your healthcare professional to discuss testing, or reach our team for help.', [
          serviceAction('Doctors', 'Contact a doctor'),
          whatsapp,
        ]);
      }
      return makeMessage('guide', 'Browse available laboratory tests to find a service. If a clinician asked for a specific test, use the name on your referral or contact us for help.', [
        serviceAction('Labs', 'Browse lab tests'),
        whatsapp,
      ]);
    }
    if (/(hospital|clinic|facility|admission)/.test(text)) {
      if (!FEATURES.hospitals) {
        return makeMessage('guide', 'Hospital booking is not currently available in MobileDoc. For urgent symptoms, go to the nearest emergency department now. For non-urgent care, contact a healthcare professional.', [
          serviceAction('Doctors', 'Find a doctor'),
          whatsapp,
        ]);
      }
      return makeMessage('guide', 'You can browse hospitals and their listed services. For urgent symptoms, go to the nearest emergency department rather than waiting for an online reply.', [
        serviceAction('Hospitals', 'Browse hospitals'),
        whatsapp,
      ]);
    }
    if (/(sign ?up|register|create.*account|join|log ?in|login|account)/.test(text)) {
      return makeMessage('guide', onGetStarted || !isAuthenticated
        ? 'You can sign in or create an account to book care and manage your health services.'
        : 'Your account is already open. Choose a service below to continue.', [
        { kind: 'signup', label: isAuthenticated ? 'Go to dashboard' : 'Sign in or create an account' },
      ]);
    }
    if (/(price|cost|payment|pay|fee|charge)/.test(text)) {
      return makeMessage('guide', 'Prices can depend on the service and are shown during booking or checkout. I can’t confirm a charge from here; contact MobileDoc if you need help with a payment.', [
        serviceAction('Appointments', 'View appointments'),
        whatsapp,
      ]);
    }
    if (/(whats ?app|contact|support|human|talk to someone|call you)/.test(text)) {
      return makeMessage('guide', 'You can reach the MobileDoc team directly on WhatsApp.', [whatsapp]);
    }
    if (/(what is mobile ?doc|about mobile ?doc|how does this work|what can you do|help)/.test(text)) {
      return makeMessage('guide', 'MobileDoc connects patients with healthcare professionals and pharmacy services. I’m an automated guide for finding the right place in the app; I don’t provide medical care.', [
        serviceAction('Doctors', 'Find a professional'),
        triage,
        whatsapp,
      ]);
    }

    return makeMessage('guide', 'I can help you find a doctor, pharmacy service, or symptom triage. For medical decisions, speak with a licensed professional. What do you need help with?', [
      serviceAction('Doctors', 'Find a doctor'),
      serviceAction('Pharmacy', 'Prescription or pharmacy'),
      triage,
      whatsapp,
    ]);
  };

  const openGuide = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([makeMessage('guide', 'Hi, I’m the MobileDoc Guide, an automated helper for finding care and using the app. I can help with next steps, but I don’t diagnose or replace a healthcare professional.', [
        serviceAction('Doctors', 'Find a doctor'),
        triageAction(),
        serviceAction('Pharmacy', 'Prescription or pharmacy'),
        { kind: 'whatsapp', label: 'Talk to us on WhatsApp' },
      ])]);
    }
  };

  function triageAction(): GuideAction {
    return isAuthenticated && onOpenTriage
      ? { kind: 'triage', label: 'Use AI triage' }
      : { kind: 'signup', label: 'Sign in to use AI triage' };
  }

  const handleAction = (action: GuideAction) => {
    if (action.kind === 'navigate') {
      if (isAuthenticated && onNavigate) {
        onNavigate(action.section);
        setIsOpen(false);
      } else {
        setMessages(current => [...current, makeMessage('guide', 'Sign in or create an account to access that service.')]);
      }
      return;
    }
    if (action.kind === 'triage') {
      onOpenTriage?.();
      setIsOpen(false);
      return;
    }
    if (action.kind === 'signup') {
      if (onGetStarted) {
        onGetStarted();
        setIsOpen(false);
      } else if (isAuthenticated && onNavigate) {
        onNavigate('Dashboard');
        setIsOpen(false);
      } else {
        setMessages(current => [...current, makeMessage('guide', 'Use the sign-in or registration options on this page to continue.')]);
      }
    }
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages(current => [...current, makeMessage('user', text), getReply(text)]);
    setInput('');
  };

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {isOpen && (
        <section
          role="dialog"
          aria-label="MobileDoc Guide"
          className="fixed bottom-20 right-3 z-[70] flex h-[70dvh] max-h-[38rem] min-h-[24rem] w-[calc(100vw-1.5rem)] max-w-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:bottom-24 sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-emerald-900/10 bg-emerald-950 px-4 py-3.5 text-white">
            <div>
              <h2 className="text-sm font-black">MobileDoc Guide</h2>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-100/80">Automated help, care navigation</p>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Close guide" className="rounded-lg p-2 text-emerald-100 transition hover:bg-white/10 hover:text-white">
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          <div ref={chatContainerRef} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto bg-[#f5faf8] p-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${message.role === 'user' ? 'rounded-2xl rounded-br-sm bg-emerald-800 text-white' : 'rounded-2xl rounded-bl-sm border border-slate-200 bg-white text-slate-800'} px-3.5 py-3 shadow-sm`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                  {!!message.actions?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action, index) => action.kind === 'whatsapp' ? (
                        <a
                          key={`${message.id}-${index}`}
                          href={WHATSAPP_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-emerald-700 px-3 py-2 text-left text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <button
                          key={`${message.id}-${index}`}
                          onClick={() => handleAction(action)}
                          className="rounded-lg border border-emerald-700 px-3 py-2 text-left text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="What can we help with?"
              aria-label="Message the MobileDoc Guide"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </form>
        </section>
      )}

      <button
        onClick={isOpen ? () => setIsOpen(false) : openGuide}
        aria-label={isOpen ? 'Close MobileDoc Guide' : 'Open MobileDoc Guide'}
        aria-expanded={isOpen}
        className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-emerald-800 text-white shadow-xl shadow-emerald-950/25 transition hover:scale-105 hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-700/30 sm:bottom-6 sm:right-6"
      >
        {isOpen ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
        <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-lime-400" aria-hidden="true" />
      </button>
    </>
  );
};

export default Chatbot;
