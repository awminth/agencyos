import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { env, isGeminiConfigured } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 8;

export type HelpChatRole = 'user' | 'model';

export interface HelpChatTurn {
  role: HelpChatRole;
  text: string;
}

let cachedKnowledge: string | null = null;

function resolveKnowledgePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, 'knowledge', 'agency-help-mm.md'),
    path.join(here, '..', 'knowledge', 'agency-help-mm.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[1];
}

function loadKnowledge(): string {
  if (cachedKnowledge) return cachedKnowledge;
  const filePath = resolveKnowledgePath();
  if (!fs.existsSync(filePath)) {
    throw new AppError('Help knowledge file မတွေ့ပါ။', 500);
  }
  cachedKnowledge = fs.readFileSync(filePath, 'utf8');
  return cachedKnowledge;
}

function buildSystemInstruction(knowledge: string): string {
  return `သင်သည် AgencyMS (Overseas Employment Agency Worker & Invoice Management System) အတွက် မြန်မာဘာသာ အကူအညီပေးသူ ဖြစ်သည်။

စည်းမျဉ်းများ:
1. AgencyMS ဆော့ဖ်ဝဲ အသုံးပြုနည်းနှင့်သာ သက်ဆိုင်သော မေးခွန်းများကို ဖြေပါ။
2. မေးခွန်းနှင့် အဖြေကို မြန်မာဘာသာဖြင့်သာ ရေးပါ။ အင်္ဂလိပ် သို့မဟုတ် အခြားဘာသာဖြင့် မေးလာပါက မြန်မာလို ပြန်မေးခိုင်းပါ။
3. ဆော့ဖ်ဝဲနှင့် မသက်ဆိုင်သော အကြောင်းအရာ (သတင်း၊ ဟာသ၊ ပရိုဂရမ်မင်း သင်ခန်းစာ၊ ရာဇဝတ်မှု စသည်) ကို ငြင်းပါ — မြန်မာလို တိုတို ရှင်းပြပါ။
4. အောက်ပါ အသုံးပြုလမ်းညွှန်စာရွက်ကိုသာ အခြေခံပါ။ စာရွက်တွင် မပါလျှင် မှန်းမဖြေဘဲ မသိကြောင်း ပြောပါ။
5. တကယ့် ဒေတာဘေ့စ်မှတ်တမ်း၊ စကားဝှက်၊ API key တောင်းခြင်း မလုပ်ရ။
6. အဖြေကို တိုရှင်း၊ အဆင့်လိုက် (လိုအပ်လျှင် နံပါတ်တပ်) ရေးပါ။

--- အသုံးပြုလမ်းညွှန် ---
${knowledge}
--- အဆုံး ---`;
}

function normalizeHistory(history: unknown): HelpChatTurn[] {
  if (!Array.isArray(history)) return [];
  const turns: HelpChatTurn[] = [];
  for (const item of history) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const text = String((item as { text?: unknown }).text || '').trim();
    if ((role !== 'user' && role !== 'model') || !text) continue;
    turns.push({ role, text: text.slice(0, MAX_MESSAGE_CHARS) });
  }
  return turns.slice(-MAX_HISTORY_TURNS * 2);
}

export async function askHelpChat(input: {
  message: unknown;
  history?: unknown;
}): Promise<{ reply: string }> {
  if (!isGeminiConfigured()) {
    throw new AppError(
      'Help Chat မရနိုင်သေးပါ။ backend/.env တွင် GEMINI_API_KEY ထည့်ပါ။',
      503
    );
  }

  const message = String(input.message || '').trim();
  if (!message) {
    throw new AppError('မေးခွန်း ရေးပါ။', 400);
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    throw new AppError(`မေးခွန်း အလွန်ရှည်ပါသည် (အများဆုံး ${MAX_MESSAGE_CHARS} လုံး)။`, 400);
  }

  const knowledge = loadKnowledge();
  const history = normalizeHistory(input.history);
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  const contents = [
    ...history.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    { role: 'user' as const, parts: [{ text: message }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction: buildSystemInstruction(knowledge),
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const reply = String(response.text || '').trim();
    if (!reply) {
      throw new AppError('အဖြေ မရရှိပါ။ ခဏနေပြီး ပြန်မေးပါ။', 502);
    }

    return { reply };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('"code":429')) {
      throw new AppError(
        'Gemini အသုံးပြုခွင့် ယာယီ ကုန်ဆုံးနေပါသည်။ ခဏနေပြီး ပြန်မေးပါ။',
        429
      );
    }
    if (msg.includes('FAILED_PRECONDITION') || msg.includes('User location')) {
      throw new AppError(
        'ဤတည်နေရာမှ Gemini API သုံး၍ မရပါ။ Render/server ဘက်မှ စမ်းပါ။',
        503
      );
    }
    console.error('Gemini help chat failed:', err);
    throw new AppError('Help Chat ချိတ်ဆက်၍ မရပါ။ ခဏနေပြီး ပြန်ကြိုးစားပါ။', 502);
  }
}
