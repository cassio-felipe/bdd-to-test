import { generateStructuredJson } from '../llm/client.js';

export async function runAgent(page, steps) {
  const actions = [];
  let lastSelector = null;

  for (const step of steps) {
    const fullStep = `${step.keyword ? `${step.keyword} ` : ''}${step.text}`;
    console.log(`➡️ Step: ${fullStep}`);

    // Tenta resolver localmente antes de chamar o LLM
    const localDecision = tryLocalMapping(fullStep, lastSelector);
    let decision;

    if (localDecision) {
      console.log(`⚡ Passo resolvido localmente (bypass LLM)`);
      decision = localDecision;
    } else {
      // DOM filtrado e compactado
      const dom = await extractRelevantDom(page);
      const prompt = buildPrompt(fullStep, dom);
      decision = await generateStructuredJson(prompt);
      console.log(`🤖 LLM decidiu: ${JSON.stringify(decision)}`);
    }

    if (decision.action === 'press' && !decision.selector) {
      decision.selector = lastSelector || 'body';
    }

    await executeAction(page, decision);

    if (decision.selector) {
      lastSelector = decision.selector;
    }

    actions.push(decision);
  }

  return actions;
}

// Tenta mapear comandos simples sem LLM
function tryLocalMapping(step, lastSelector) {
  const s = step.toLowerCase();

  // Goto
  const gotoMatch = step.match(/open\s+(https?:\/\/[^\s]+)/i) || step.match(/acesso\s+(https?:\/\/[^\s]+)/i);
  if (gotoMatch) {
    return { action: 'goto', url: gotoMatch[1] };
  }

  // Assert Text (simples)
  const assertMatch = step.match(/should see "([^"]+)"/i) || step.match(/devo ver "([^"]+)"/i);
  if (assertMatch) {
    return { action: 'assertText', text: assertMatch[1] };
  }

  // Press Enter
  const pressMatch = step.match(/press\s+enter/i) || step.match(/pressiono\s+enter/i);
  if (pressMatch) {
    return { action: 'press', key: 'Enter', selector: lastSelector };
  }

  return null;
}

// Extrai apenas elementos interativos e compacta o JSON (muita economia de tokens)
async function extractRelevantDom(page) {
  return page.evaluate(() => {
    const elements = [];
    const selectors = ['input', 'textarea', 'button', 'a', '[role="button"]', 'select'];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const entry = {
          t: el.tagName.toLowerCase(),
          ty: el.getAttribute('type') || undefined,
          n: el.getAttribute('name') || undefined,
          i: el.id || undefined,
          a: el.getAttribute('aria-label') || undefined,
          p: el.getAttribute('placeholder') || undefined,
          r: el.getAttribute('role') || undefined,
          tid: el.getAttribute('data-testid') || undefined,
          tx: (el.innerText || '').trim().slice(0, 40) || undefined,
        };

        // Remove chaves vazias
        Object.keys(entry).forEach(k => !entry[k] && delete entry[k]);
        if (Object.keys(entry).length > 1) elements.push(entry);
      });
    });

    return JSON.stringify(elements); // Sem espaços/newlines
  });
}

function buildPrompt(step, dom) {
  return `STEP: ${step}\nDOM: ${dom}`;
}

async function executeAction(page, action) {
  switch (action.action) {
    case 'goto':
      await page.goto(action.url, { waitUntil: 'domcontentloaded' });
      await dismissGoogleConsent(page);
      break;

    case 'click':
      await page.waitForSelector(action.selector, { timeout: 10000 });
      await page.click(action.selector);
      break;

    case 'fill':
      action.selector = await fillWithFallback(page, action);
      break;

    case 'press':
      await page.waitForSelector(action.selector, { timeout: 10000 });
      await page.press(action.selector, action.key || 'Enter');
      break;

    case 'assertText':
      await page.waitForSelector(`text=${action.text}`, { timeout: 10000 });
      break;

    default:
      throw new Error(`Ação inválida: ${action.action}`);
  }

  await page.waitForTimeout(1500);
}

async function fillWithFallback(page, action) {
  const fallbackSelectors = [
    action.selector,
    'input[name="q"]',
    'textarea[name="q"]',
    'input[title="Pesquisar"]',
    'input[title="Search"]',
    '[aria-label="Pesquisar"]',
    '[aria-label="Search"]',
  ].filter(Boolean);

  for (const selector of fallbackSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.fill(selector, action.value);
      console.log(`✅ Campo preenchido com seletor: ${selector}`);
      return selector;
    } catch {
      console.log(`⚠️ Seletor não encontrado: ${selector}, tentando próximo...`);
    }
  }

  throw new Error(`Nenhum seletor de input funcionou para o step de fill`);
}

async function dismissGoogleConsent(page) {
  const consentSelectors = [
    'button[aria-label="Aceitar tudo"]',
    'button[aria-label="Accept all"]',
    '#L2AGLb',
    'button:has-text("Aceitar tudo")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
  ];

  for (const selector of consentSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log(`✅ Popup de consentimento fechado: ${selector}`);
        await page.waitForTimeout(1000);
        return;
      }
    } catch { }
  }
}
