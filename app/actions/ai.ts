'use server';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

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
export async function runTriageAIAction(userInput: string, history: any[]) {
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
        systemInstruction: {
          parts: [{
          text: `You are a medical triage AI for the MobileDoc Healthcare platform. Your goal is to assess user symptoms.

GUIDELINES:
1. Ask 2-3 specific clarifying questions about duration, severity, and associated symptoms.
2. Maintain a professional, empathetic, and clinical tone.
3. After enough information is gathered, provide a JSON response (and only JSON) in this exact format:
   {
     "triageLevel": "Emergency" | "Urgent" | "Routine",
     "symptomSummary": "Brief technical summary",
     "recommendedAction": "Immediate steps for the user",
     "generatedReport": "A full Markdown report for the doctor",
     "referrals": [{"type": "Hospital" | "Doctor", "reason": "Why"}]
   }
4. IMPORTANT: If symptoms indicate a life-threatening emergency (e.g. severe chest pain, stroke signs), immediately triage as 'Emergency' and advise calling emergency services.`
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