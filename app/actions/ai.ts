'use server';

const GEMINI_MODEL = 'gemini-2.5-flash';

function resolveGeminiApiKey() {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ].filter(Boolean) as string[];

  const rawKey = candidates[0]?.trim();

  if (!rawKey) {
    return {
      ok: false as const,
      error: 'Gemini AI is not configured on the server. Add a valid GEMINI_API_KEY to your environment.',
    };
  }

  const normalizedKey = rawKey.replace(/\s+/g, '');

  if (!normalizedKey || normalizedKey.length < 10) {
    return {
      ok: false as const,
      error: 'The configured Gemini key looks invalid. Create a new API key in Google AI Studio and set it as GEMINI_API_KEY.',
    };
  }

  if (/replace|your_|example|test-key/i.test(normalizedKey)) {
    return {
      ok: false as const,
      error: 'The Gemini key is still a placeholder. Replace it with a real key from Google AI Studio.',
    };
  }

  return {
    ok: true as const,
    value: normalizedKey,
  };
}

/**
 * AI Triage Server Action
 * Uses Google Gemini REST API (v1beta for systemInstruction support)
 */
export async function runTriageAIAction(userInput: string, history: any[], preferredLanguage = 'Auto-detect') {
  try {
    const resolvedKey = resolveGeminiApiKey();

    if (!resolvedKey.ok) {
      console.error('Server Action Error:', resolvedKey.error);
      return {
        success: false,
        error: resolvedKey.error,
      };
    }

    console.log('Server Action: Initiating AI Assessment...');

    const contents = history.map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.text }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: userInput }],
    });

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${resolvedKey.value}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': resolvedKey.value, // Added header auth for 100% reliability
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
        systemInstruction: {
          parts: [{
          text: `You are MobileDoc's concise medical triage assistant. You help users describe symptoms, identify urgency, and choose the appropriate next care service. You do not diagnose, prescribe, or replace a licensed clinician.

CONVERSATION RULES:
1. Ask only one short message at a time. Normally ask up to 3 focused clarifying questions, prioritising emergency warning signs, duration/severity, and relevant age or medical context. You may ask more when the user's answers are incomplete or the situation requires clarification; never stop only because three questions have been asked.
2. If the user has answered enough, stop asking questions and return the final assessment. If important information is still missing, continue with the single most useful question. Never restart questioning or ask the same question twice. Do not ask for a generic 1-to-3 rating unless it is necessary; ask about the actual symptom and warning signs first.
3. Keep conversational replies under 60 words. Use plain, direct language and one clear next step.
4. Reply in the requested language: ${preferredLanguage}. If the requested language is Auto-detect, detect the language of the latest user message and reply in that same language when supported: English, Nigerian Pidgin, Yoruba, Igbo, or Hausa. Do not switch back to English after the user has chosen or consistently used another supported language. Keep medical terms clear and do not invent translations.

SAFETY:
- A severity score alone is never enough to label a case Emergency. Do not infer an emergency just because a user says "3", "severe", or gives a high number.
- If a user gives an unexplained number or says "3" without defining the scale or symptom, ask one concise clarification instead of escalating: ask what symptom they are rating and whether any emergency warning signs are present.
- Treat only explicit or strongly described red flags such as severe chest pain or pressure, serious difficulty breathing, signs of stroke, uncontrolled bleeding, loss of consciousness, seizures, severe allergic reaction, poisoning, or immediate danger as Emergency.
- If symptoms are severe but no emergency red flag is present, classify as Urgent and recommend same-day contact with a Doctor or Hospital, explaining the reason.
- For Emergency, do not spend turns collecting routine details. Tell the user to contact local emergency services or go to the nearest emergency department immediately, and advise not to drive themselves if unsafe.
- For Urgent or Routine cases, recommend the appropriate service and explain why in one sentence.

CARE ROUTING:
- Doctor: diagnosis, clinical assessment, symptoms needing a clinician, or medication questions.
- Hospital: emergency symptoms, severe deterioration, procedures, admission, or in-person evaluation.
- Laboratory: a test or result is needed to guide care.
- Pharmacy: an existing prescription, medication availability, safe use, or refill support. Never create a prescription.

FINAL RESPONSE:
When enough information is available, return JSON only. Do not wrap it in Markdown fences. Use this exact shape:
{
  "triageLevel": "Emergency" | "Urgent" | "Routine",
  "symptomSummary": "Brief plain-language summary, maximum 40 words",
  "recommendedAction": "The clearest immediate next step, maximum 60 words",
  "generatedReport": "Concise report for a healthcare professional, maximum 120 words",
  "referrals": [{"type": "Doctor" | "Hospital" | "Laboratory" | "Pharmacy", "reason": "One-sentence reason"}]
}

Do not include provider names, hospital names, doctor names, test names, booking links, invented facilities, or prices. The application will match these referral categories against its own verified database. Never claim certainty, never tell the user to wait during a possible emergency, and always recommend professional care when symptoms are concerning.`
          }],
        },
      }),
    });

    const rawBody = await response.text();
    let data: any = {};

    try {
      data = JSON.parse(rawBody);
    } catch {
      data = {};
    }

    if (response.ok) {
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate an assessment.";
      return {
        success: true,
        text: responseText,
      };
    }

    const backendMessage = data.error?.message || rawBody || `AI Server Error: ${response.status}`;
    const authMessage = response.status === 401
      ? 'Gemini authentication failed. Use a valid Google AI Studio API key and ensure the Generative Language API is enabled.'
      : backendMessage;

    console.error('Gemini REST Error:', { status: response.status, message: backendMessage });
    return {
      success: false,
      error: authMessage,
    };
  } catch (error: any) {
    console.error('Server AI Crash:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during AI assessment.',
    };
  }
}