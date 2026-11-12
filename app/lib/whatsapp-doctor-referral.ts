import 'server-only';
import { createClient } from '@supabase/supabase-js';

const specialties: Record<string, RegExp> = {
  'General Practice': /general pract|family (?:med|phys)|medical officer|general physician|^doctor(?:\s*\(MDCN\))?$/i,
  Paediatrics: /paediatr|pediatr/i,
  'Obstetrics and Gynaecology': /obstet|gyn[ae]+col/i,
  Dermatology: /dermat/i, Cardiology: /cardiol/i,
  'Mental Health': /psychiatr/i, Dentistry: /dentist|dental/i,
  ENT: /otolaryng|\bent\b|ear.*nose.*throat/i,
  Ophthalmology: /ophthalm/i, Orthopaedics: /orthop[ae]+d/i,
  Neurology: /neurolog/i, Urology: /urolog/i,
  Gastroenterology: /gastroenter/i, Endocrinology: /endocrin/i,
};
type Doctor = { id: string; full_name: string; specialty: string | null; role: string | null };
const browse = 'https://mobiledoc247.com/?care=doctors';
const clean = (value: string) => value.replace(/[\r\n*_~`<>]/g, ' ').replace(/https?:\/\/\S+/gi, '').slice(0, 90);

// Only application-owned directory data supplies names and links; the model selects a category.
export async function doctorReferral(requested: unknown, urgent = false) {
  const specialty = typeof requested === 'string' && Object.hasOwn(specialties, requested) ? requested : 'General Practice';
  const caution = urgent ? 'Please seek care today; if an online appointment is not available promptly, get in-person care.\n\n' : '';
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('DIRECTORY_UNAVAILABLE');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const load = (fields: string) => db.from('profiles').select(fields)
      .eq('user_type', 'professional').eq('status', 'active').order('id').limit(1000)
      .abortSignal(AbortSignal.timeout(4000));
    let { data, error } = await load('id, full_name, specialty, role');
    // Older production schemas store the specialty in role only.
    if (error?.code === '42703') {
      const legacy = await load('id, full_name, role');
      data = legacy.data; error = legacy.error;
    }
    if (error) throw error;
    const doctors = (data as unknown as Doctor[] || []).filter((d: Doctor) => d.full_name && /^[0-9a-f-]{36}$/i.test(d.id));
    let matches = doctors.filter((d: Doctor) => specialties[specialty].test(d.specialty || d.role || ''));
    const fallback = matches.length === 0 && specialty !== 'General Practice';
    if (fallback) matches = doctors.filter((d: Doctor) => specialties['General Practice'].test(d.specialty || d.role || ''));
    if (!matches.length) return caution + `I couldn't find an active ${specialty} match right now. You can review our current care options here:\n${browse}\nSign in or create an account to continue.`;
    const options = matches.slice(0, 2).map((d: Doctor) => `${clean(d.full_name)} — ${clean(d.specialty || d.role || 'General Practice')}\n${browse}&doctor=${encodeURIComponent(d.id)}`);
    return caution + (fallback ? `I couldn't find an active ${specialty} specialist. A doctor can provide an initial assessment and guide the next step:\n\n` : `These MobileDoc doctors may be suitable for ${specialty} care:\n\n`) + options.join('\n\n') + '\n\nOpen a link, sign in or create an account, then choose Book Consultation. Check availability on the site; no booking has been made yet.';
  } catch {
    return caution + `I can't check our doctor directory right now. Browse doctors and book on our site:\n${browse}\nSign in or create an account to continue.`;
  }
}
