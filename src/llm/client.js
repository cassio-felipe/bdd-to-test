import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

console.log('GROQ model:', GROQ_MODEL);
console.log('GROQ key loaded:', Boolean(GROQ_API_KEY));

function extractJson(text) {
  const cleaned = String(text || '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch?.[1]) {
    try {
      return JSON.parse(markdownMatch[1].trim());
    } catch {}
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  throw new Error(`Não foi possível extrair JSON. Resposta original:\n${text}`);
}

// Extrai o tempo de espera do header Retry-After ou da mensagem de erro
function parseRetryAfter(errorText, headers) {
  const retryHeader = headers?.get?.('retry-after');
  if (retryHeader) {
    return parseFloat(retryHeader) * 1000;
  }

  const match = errorText.match(/try again in (\d+)m(\d+(?:\.\d+)?)s/);
  if (match) {
    return (parseFloat(match[1]) * 60 + parseFloat(match[2])) * 1000;
  }

  return 10000; // fallback: 10 segundos
}

async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não definida no arquivo .env');
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em automação Playwright.
Responda EXCLUSIVAMENTE com JSON no formato:
{
  "action": "goto|click|fill|press|assertText",
  "selector": "seletor CSS",
  "value": "texto",
  "url": "url",
  "key": "tecla",
  "text": "texto"
}
Regras:
- O DOM é enviado compactado: t (tag), ty (type), n (name), i (id), a (aria-label), p (placeholder), r (role), tid (testid), tx (text).
- Para passos como "search for X", use a ação "fill" no campo de texto adequado.
- Selector é obrigatório para click, fill, press.
- Key é obrigatório para press (ex: "Enter").
- Sem explicações, apenas o JSON.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (response.status === 429) {
    const errorText = await response.text();
    const waitMs = parseRetryAfter(errorText, response.headers);
    const waitSec = Math.ceil(waitMs / 1000);

    console.log(`⏳ Rate limit atingido. Aguardando ${waitSec}s antes de tentar novamente...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));

    throw new Error('RETRY');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API da GROQ: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`Resposta inesperada da GROQ: ${JSON.stringify(data)}`);
  }

  return extractJson(content);
}

export async function generateStructuredJson(prompt, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGroq(prompt);
    } catch (error) {
      if (error.message === 'RETRY' && attempt < maxRetries) {
        console.log(`🔄 Tentativa ${attempt + 1} de ${maxRetries}...`);
        continue;
      }
      throw error;
    }
  }
}
