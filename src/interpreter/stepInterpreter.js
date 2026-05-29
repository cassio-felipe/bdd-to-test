// src/interpreter/stepInterpreter.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function interpretSteps(steps) {
  const stepsText = steps.map(s => `${s.keyword} ${s.text}`).join('\n');

  const prompt = `
    Você é um engenheiro de automação de testes sênior.
    Traduza os seguintes passos BDD em um array de ações JSON para o Playwright.
    
    Ações permitidas:
    - { "action": "goto", "url": "<url_completa>" }
    - { "action": "click", "selector": "<css_selector>" }
    - { "action": "fill", "selector": "<css_selector>", "value": "<texto>" }
    - { "action": "press", "selector": "<css_selector>", "key": "<nome_da_tecla>" }

    Infira os seletores CSS mais prováveis baseados no contexto (ex: barra de busca do google é 'input[name="q"]').

    Passos BDD:
    ${stepsText}

    Responda APENAS com um objeto JSON no formato: { "actions": [ ... ] }
  `;

  console.log('🧠 Solicitando interpretação para a LLM...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Rápido, barato e excelente para JSON
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Baixa temperatura para respostas determinísticas
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Mescla a ação gerada pela LLM com o passo original do Gherkin
  return steps.map((step, index) => ({
    ...step,
    action: result.actions[index],
  }));
}
