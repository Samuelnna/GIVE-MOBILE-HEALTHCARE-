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
export const WHATSAPP_CONSENT = '*Welcome to MobileDoc* 👋\nYour AI health assistant on WhatsApp.\n\nI can help with brief symptom guidance, health questions, and medication reminders you set. Most care continues at https://mobiledoc247.com\n\nWith your permission, your messages are processed using AI and recent chat context is kept for follow-up for 24 hours of inactivity. We measure usage without showing your messages in admin analytics. Reminder messages need separate confirmation.\n\nAI guidance is not a diagnosis. For an emergency, seek immediate care; do not wait for this chat.\n\nPrivacy: https://mobiledoc247.com/privacy-policy\n\nChoose *Yes, continue* to agree, or *No thanks*. STOP withdraws permission and cancels reminders.';
export const WHATSAPP_DECLINED = 'No problem. AI chat is paused and any saved reminders have been cancelled. You can use https://mobiledoc247.com for care. Send HELLO if you want to review consent again.';
export const WHATSAPP_HANDOFF = 'Let’s continue your care at https://mobiledoc247.com — sign in to choose a healthcare professional. This chat gives brief guidance, not a diagnosis.\n\nIf you may be in immediate danger, seek emergency care now rather than waiting for an online consultation. You can still send MENU to manage reminders.';
export const WHATSAPP_MORE = '*More ways MobileDoc can help*\nChoose below, or continue your care at https://mobiledoc247.com\n\nMedication reminders repeat only the schedule you enter. STOP REMINDERS cancels them.';
export const WHATSAPP_WELCOME = "👋 *Welcome to MobileDoc*\nYour AI health assistant on WhatsApp.\n\nI can help you:\n• Understand your symptoms\n• Ask general health questions\n• Find care through our website\n\nChoose an option below, or describe what is bothering you.\n\nAI guidance, not a diagnosis. Send MENU to see these options again.";
export const WHATSAPP_RESET = "Your previous symptom conversation has been cleared.\n\n👋 *Welcome back to MobileDoc*\nChoose where to start, or describe your symptoms.\n\nAI guidance, not a diagnosis. Send MENU for these options.";
export const WHATSAPP_SYMPTOMS = '*Let’s check your symptoms*\n\nWhat symptoms are you experiencing? You can write in English, Nigerian Pidgin, Yoruba, Igbo, or Hausa.\n\nI’ll ask a few focused questions and help you understand the next step. You can describe symptoms directly at any time.';
export const WHATSAPP_QUESTION = '*What would you like to know?*\n\nAsk your health question in your own words. I can explain general health information; for personal symptoms, I’ll help assess what care may be needed.\n\nSend MENU to change options.';
export const WHATSAPP_DOCTOR = '*Find a doctor with MobileDoc*\n\n1. Open https://mobiledoc247.com\n2. Sign in or create an account.\n3. Choose a healthcare professional and follow the consultation steps.\n\nI haven’t booked or contacted anyone. If you are seriously unwell, seek immediate in-person care rather than waiting for an online booking.\n\nYou can also check symptoms or ask a health question here.';

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
  if (text === WHATSAPP_CONSENT) return { type: 'button', body: { text }, footer: { text: 'Your choice • MobileDoc' },
    header: { type: 'image', image: { link: 'https://mobiledoc247.com/whatsapp/getting-started.png' } },
    action: { buttons: buttons(['md_consent', 'md_decline']) } };
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
