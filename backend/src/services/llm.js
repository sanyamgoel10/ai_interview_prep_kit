const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Provider config ────────────────────────────────────────────────────────────
const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

const DEFAULT_MODELS = {
  gemini: 'gemini-1.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
  'openai-compatible': 'gpt-4o-mini',
};

const BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const MODEL = process.env.LLM_MODEL || DEFAULT_MODELS[PROVIDER] || DEFAULT_MODELS.gemini;

console.log(`LLM provider: ${PROVIDER}, model: ${MODEL}`);

// ── Gemini setup ───────────────────────────────────────────────────────────────
let geminiJsonModel, geminiTextModel;
if (PROVIDER === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiJsonModel = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
  });
  geminiTextModel = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.3 },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractJson(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}
  // Extract first JSON object/array from text
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    try { return JSON.parse(match[1]); } catch {}
  }
  throw new Error(`Could not parse JSON from LLM response: ${text.slice(0, 200)}`);
}

function getApiKey() {
  switch (PROVIDER) {
    case 'groq': return process.env.GROQ_API_KEY;
    case 'openrouter': return process.env.OPENROUTER_API_KEY;
    case 'openai-compatible': return process.env.OPENAI_COMPATIBLE_API_KEY;
    default: return null;
  }
}

function getBaseUrl() {
  if (PROVIDER === 'openai-compatible') {
    return process.env.OPENAI_COMPATIBLE_BASE_URL || 'https://api.openai.com/v1';
  }
  return BASE_URLS[PROVIDER];
}

// ── OpenAI-compatible HTTP call (Groq, OpenRouter, etc.) ─────────────────────
async function callOpenAICompatible(prompt, jsonMode = true) {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  if (!apiKey) throw new Error(`No API key set for provider "${PROVIDER}". Set ${PROVIDER.toUpperCase().replace(/-/g, '_')}_API_KEY in .env`);

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (PROVIDER === 'openrouter') {
    headers['HTTP-Referer'] = process.env.FRONTEND_URL || 'http://localhost:3000';
    headers['X-Title'] = 'AI Interview Prep Kit';
  }

  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(`[${res.status} ${res.statusText}] ${JSON.stringify(errBody)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Retry wrapper ──────────────────────────────────────────────────────────────
function isRetryable(err) {
  const status = err.status;
  if (status === 429 || status === 503 || status === 500) return true;
  const msg = err.message || '';
  return msg.includes('429') || msg.includes('503') || msg.includes('overloaded');
}

async function withRetry(fn, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (isRetryable(err) && i < retries - 1) {
        const delay = Math.min(Math.pow(2, i) * 2000, 60000);
        console.log(`LLM rate limit/overload, retrying in ${delay}ms (attempt ${i + 1}/${retries})`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
async function callLLM(prompt) {
  return withRetry(async () => {
    if (PROVIDER === 'gemini') {
      const result = await geminiJsonModel.generateContent(prompt);
      return extractJson(result.response.text());
    }
    const text = await callOpenAICompatible(prompt, true);
    return extractJson(text);
  });
}

async function callLLMText(prompt) {
  return withRetry(async () => {
    if (PROVIDER === 'gemini') {
      const result = await geminiTextModel.generateContent(prompt);
      return result.response.text();
    }
    return callOpenAICompatible(prompt, false);
  });
}

module.exports = { callLLM, callLLMText };
