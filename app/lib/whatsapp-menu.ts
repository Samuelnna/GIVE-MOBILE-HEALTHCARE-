export const WHATSAPP_CHOICES = {
  md_symptoms: { title: 'Check symptoms', text: 'Check symptoms' },
  md_question: { title: 'Ask health question', text: 'Ask a health question' },
  md_doctor: { title: 'Find a doctor', text: 'Find a doctor' },
} as const;
export type WhatsAppChoice = keyof typeof WHATSAPP_CHOICES;

export const WHATSAPP_PRIVACY_NOTICE = 'Recent messages are kept for follow-up for up to 24 hours of inactivity. Send RESET to clear this conversation. Avoid sharing identifying details.';
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
  return undefined;
}

// Deterministic presentation from the cached reply keeps retries identical without
// adding transport metadata or a second migration to the conversation database.
export function whatsappInteractiveReply(text: string) {
  const mainMenu = text === WHATSAPP_WELCOME || text.startsWith(WHATSAPP_WELCOME + '\n\n') ||
    text === WHATSAPP_RESET || text.startsWith(WHATSAPP_RESET + '\n\n');
  if (!mainMenu && text !== WHATSAPP_DOCTOR && !text.startsWith(WHATSAPP_DOCTOR + '\n\n')) return undefined;
  return {
    type: 'button',
    ...(mainMenu ? { header: { type: 'image', image: { link: 'https://mobiledoc247.com/whatsapp/getting-started.png' } } } : {}),
    body: { text: text.slice(0, 1024) },
    footer: { text: 'MobileDoc • AI health guidance' },
    action: { buttons: Object.entries(WHATSAPP_CHOICES).map(([id, choice]) => ({ type: 'reply', reply: { id, title: choice.title } })) },
  };
}
