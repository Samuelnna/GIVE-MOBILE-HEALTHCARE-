export const WHATSAPP_CHOICES = {
  md_consent: { title: 'Yes, continue', text: 'Yes, continue' },
  md_decline: { title: 'No thanks', text: 'No thanks' },
  md_symptoms: { title: 'Check symptoms', text: 'Check symptoms' },
  md_question: { title: 'Ask health question', text: 'Ask a health question' },
  md_doctor: { title: 'Find a doctor', text: 'Find a doctor' },
  md_reminder: { title: 'Medication reminders', text: 'Medication reminders' },
  md_reminder_confirm: { title: 'Confirm reminders', text: 'CONFIRM REMINDERS' },
  md_reminder_cancel: { title: 'Cancel setup', text: 'CANCEL' },
  md_more: { title: 'More options', text: 'More options' },
} as const;
export type WhatsAppChoice = keyof typeof WHATSAPP_CHOICES;

export const WHATSAPP_PRIVACY_NOTICE = 'Recent messages are kept for follow-up for up to 24 hours of inactivity. Send RESET to clear this conversation. Avoid sharing identifying details.';
export const WHATSAPP_CONSENT = "👋 Hi there! I'm MobileDoc, your friendly AI health assistant on WhatsApp.\n\nI can help you:\n✅ Understand your symptoms\n✅ Get answers to health questions\n✅ Set your medication reminders\n✅ Find a doctor through MobileDoc\n\nYour privacy is our top priority.\nShall we get you set up?";
export const WHATSAPP_DECLINED = 'No problem. AI chat is paused and any saved reminders have been cancelled. You can use https://mobiledoc247.com for care. Send HELLO if you want to review consent again.';
export const WHATSAPP_HANDOFF = 'Let’s continue your care at https://mobiledoc247.com — sign in to choose a healthcare professional. This chat gives brief guidance, not a diagnosis.\n\nIf you may be in immediate danger, seek emergency care now rather than waiting for an online consultation. You can still send MENU to manage reminders.';
export const WHATSAPP_MORE = '*More ways MobileDoc can help*\nChoose below, or continue your care at https://mobiledoc247.com\n\nMedication reminders repeat only the schedule you enter. STOP REMINDERS cancels them.';
export const WHATSAPP_WELCOME = "😊 *Welcome to MobileDoc!*\nI'm glad you're here. How can I help you today?\n\nTell me how you're feeling, ask a health question, or choose an option below. We can take it one step at a time.";
export const WHATSAPP_RESET = "All fresh 😊 Your earlier chat has been cleared.\n\nHow can I help you today?";
export const WHATSAPP_SYMPTOMS = "I'm here to help 😊 What symptoms are you experiencing?\n\nYou can tell me in English, Nigerian Pidgin, Yoruba, Igbo, or Hausa.";
export const WHATSAPP_QUESTION = "Of course 😊 Ask your health question, and we'll talk it through.";
export const WHATSAPP_DOCTOR = '*Let\u2019s find the right doctor for you*\n\nWhat would you like help with, or which specialist are you looking for? I can suggest a suitable doctor from our network.\n\nYou can also browse and book here: https://mobiledoc247.com/?care=doctors\n\nI haven\u2019t booked or contacted anyone. If you are seriously unwell, seek immediate in-person care.';

export function knownWhatsAppChoice(value: unknown): WhatsAppChoice | undefined {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(WHATSAPP_CHOICES, value)
    ? value as WhatsAppChoice : undefined;
}

export function menuReply(text: string, selection?: WhatsAppChoice) {
  if (/^(?:\/?reset|\/?start|new assessment|forget me)$/i.test(text.trim())) return { text: WHATSAPP_RESET, reset: true };
  if (/^(?:\/?menu|\/?help|hello[!. ]*|hi[!. ]*|hey[!. ]*|good (?:morning|afternoon|evening)[!. ]*|how it works|how does (?:it|this) work\??)$/i.test(text.trim())) {
    return { text: WHATSAPP_WELCOME, reset: false };
  }
  const choice = selection || (Object.keys(WHATSAPP_CHOICES) as WhatsAppChoice[])
    .find(id => [WHATSAPP_CHOICES[id].text.toLowerCase(), WHATSAPP_CHOICES[id].title.toLowerCase()].includes(text.trim().toLowerCase()));
  if (choice === 'md_symptoms') return { text: WHATSAPP_SYMPTOMS, reset: false };
  if (choice === 'md_question') return { text: WHATSAPP_QUESTION, reset: false };
  if (choice === 'md_doctor') return { text: WHATSAPP_DOCTOR, reset: false };
  if (choice === 'md_reminder') return { text: 'REMINDER_SETUP', reset: false };
  if (choice === 'md_more') return { text: WHATSAPP_MORE, reset: false };
  return undefined;
}

// Deterministic presentation from the cached reply keeps retries identical without
// adding transport metadata or a second migration to the conversation database.
export function whatsappInteractiveReply(text: string) {
  const buttons = (ids: WhatsAppChoice[]) => ids.map(id => ({ type: 'reply', reply: { id, title: WHATSAPP_CHOICES[id].title } }));
  if (text === WHATSAPP_CONSENT) return { type: 'button', body: { text },
    action: { buttons: buttons(['md_consent']) } };
  if (text.startsWith('*Confirm your reminder*')) return { type: 'button', body: { text: text.slice(0, 1024) },
    action: { buttons: buttons(['md_reminder_confirm', 'md_reminder_cancel']) } };
  const mainMenu = text === WHATSAPP_WELCOME || text.startsWith(WHATSAPP_WELCOME + '\n\n') ||
    text === WHATSAPP_RESET || text.startsWith(WHATSAPP_RESET + '\n\n');
  if (mainMenu) return { type: 'button', header: { type: 'image', image: { link: 'https://mobiledoc247.com/whatsapp/getting-started.png' } },
    body: { text: text.slice(0,1024) },footer:{text:'MobileDoc • AI health guidance'},action:{buttons:buttons(['md_symptoms','md_doctor','md_more'])} };
  if (text!==WHATSAPP_MORE && text !== WHATSAPP_DOCTOR && !text.startsWith(WHATSAPP_DOCTOR + '\n\n')) return undefined;
  return {
    type: 'list',
    header: { type: 'text', text: 'MobileDoc | Your next step' },
    body: { text: text.slice(0, 1024) },
    footer: { text: 'MobileDoc • AI health guidance' },
    action: { button: 'Choose an option', sections: [{ title: 'How can we help?', rows: (['md_symptoms','md_question','md_doctor','md_reminder'] as WhatsAppChoice[])
      .map(id => ({ id, title: WHATSAPP_CHOICES[id].title, description: id==='md_reminder' ? 'Set or cancel your own medication schedule' : id==='md_doctor' ? 'Continue on mobiledoc247.com' : id==='md_symptoms' ? 'A few focused questions, then next steps' : 'A brief explanation, with links to care' })) }] },
  };
}
