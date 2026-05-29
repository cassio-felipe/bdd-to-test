# BDD to Cypress 🚀

Transforme seus arquivos de especificação BDD (Gherkin) em testes automatizados do Cypress de forma inteligente usando Inteligência Artificial.

## 🌟 O que faz este projeto?

Este projeto automatiza a criação de testes Cypress a partir de arquivos `.feature`. Ele utiliza um motor híbrido que:
1. **Analisa** o arquivo BDD.
2. **Executa** os passos em um navegador real (via Playwright) para descobrir os seletores e comportamentos dinamicamente.
3. **Utiliza LLMs (Groq/Llama 3)** para decidir quais elementos interagir com base no estado atual do DOM.
4. **Gera** um arquivo de teste `.cy.js` pronto para ser usado no Cypress.

## 🛠️ Tecnologias

- **Linguagem:** Node.js (ESM)
- **BDD Parser:** `@cucumber/gherkin`
- **Execution Engine:** Playwright (para descoberta dinâmica)
- **LLM:** Groq API (Llama 3.3 70B)
- **Templating:** Handlebars
- **Test Framework:** Cypress (alvo final)

## 🚀 Como Começar

### Pré-requisitos

- Node.js (v18 ou superior)
- Uma chave de API da [Groq](https://console.groq.com/)

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/bdd-to-cypress.git
   cd bdd-to-cypress
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto:
   ```env
   GROQ_API_KEY=sua_chave_aqui
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

### Uso

Para gerar um teste Cypress a partir de um arquivo `.feature`:

```bash
npm run generate google.feature
```

O comando irá:
- Ler o arquivo `google.feature`.
- Abrir um navegador em background (headless).
- Mapear os passos para ações reais no site.
- Criar o arquivo em `cypress/e2e/google_search.cy.js`.

## 📁 Estrutura do Projeto

- `src/parser/`: Transforma arquivos `.feature` em AST (Abstract Syntax Tree).
- `src/execution/`: Motor que usa Playwright e o Agente LLM para "entender" o site.
- `src/llm/`: Integração com a API da Groq para tomada de decisão.
- `src/mapper/`: Traduz ações capturadas para comandos do Cypress.
- `src/generator/`: Gera o código final do Cypress usando templates.
- `src/output/`: Salva os arquivos gerados.

## 💡 Por que usar LLM?

Diferente de geradores estáticos, este projeto "vê" o site. Se um botão mudar de ID ou classe, o LLM analisa o contexto (texto, aria-labels, roles) e encontra o elemento correto, garantindo que o teste gerado seja resiliente e baseado na experiência do usuário.

---
Feito com ❤️ por [Cassio Felipe](https://github.com/cassiofelipe)
# bdd-to-test
