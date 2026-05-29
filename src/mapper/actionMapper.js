// src/mapper/actionMapper.js

export function mapActions(actions) {
  const optimized = optimizeActions(actions);
  return optimized.map(action => generateCypressCommand(action));
}

// ─────────────────────────────────────────────
// OTIMIZADOR: transforma a sequência de ações
// antes de gerar o código Cypress
// ─────────────────────────────────────────────
function optimizeActions(actions) {
  const result = [];
  let i = 0;

  while (i < actions.length) {
    const current = actions[i];
    const next = actions[i + 1];

    // R1: Merge fill + press no mesmo seletor
    // Ex: fill("Playwright") + press("Enter") → type("Playwright{enter}")
    if (
      current.action === 'fill' &&
      next?.action === 'press' &&
      normalizeSelector(current.selector) === normalizeSelector(next.selector)
    ) {
      result.push({
        action: 'fillAndPress',
        selector: current.selector,
        value: current.value,
        key: next.key,
      });
      i += 2; // Pula os dois
      continue;
    }

    result.push(current);
    i++;
  }

  return result;
}

// ─────────────────────────────────────────────
// GERADOR: converte cada ação em comando Cypress
// ─────────────────────────────────────────────
function generateCypressCommand(action) {
  switch (action.action) {
    case 'goto':
      return `cy.visit('${sanitize(action.url)}');`;

    case 'click':
      return `cy.get('${normalizeSelector(action.selector)}').click();`;

    case 'fill':
      return `cy.get('${normalizeSelector(action.selector)}').clear().type('${escapeString(action.value)}');`;

    // R1: fill + press mergeados
    case 'fillAndPress':
      return `cy.get('${normalizeSelector(action.selector)}').clear().type('${escapeString(action.value)}{${action.key.toLowerCase()}}');`;

    // R2: press isolado (sem fill anterior)
    case 'press':
      return `cy.get('${normalizeSelector(action.selector)}').type('{${String(action.key).toLowerCase()}}');`;

    // R3: assertText inteligente
    case 'assertText':
      return buildAssert(action);

    default:
      throw new Error(`Mapeamento não suportado: ${action.action}`);
  }
}

// ─────────────────────────────────────────────
// ASSERT INTELIGENTE
// Detecta o contexto para gerar o assert ideal
// ─────────────────────────────────────────────
function buildAssert(action) {
  const text = String(action.text || '').trim();

  // Se o texto parece uma URL parcial → valida a URL
  if (action.url || /^https?:\/\//.test(text)) {
    return `cy.url().should('include', '${sanitize(action.url || text)}');`;
  }

  // Se vier com seletor → valida dentro do elemento
  if (action.selector) {
    return `cy.get('${normalizeSelector(action.selector)}').should('contain', '${escapeString(text)}');`;
  }

  // Default: verifica se o texto está visível na página
  return `cy.contains('${escapeString(text)}').should('be.visible');`;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Troca aspas simples por duplas dentro de seletores CSS
// Ex: textarea[name='q'] → textarea[name="q"]
function normalizeSelector(selector = '') {
  return String(selector).replace(/'/g, '"');
}

// Escapa apenas o necessário para strings JS entre aspas simples
function escapeString(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

// Limpa URLs e valores simples
function sanitize(value = '') {
  return String(value).trim();
}
