import { chromium } from 'playwright';
import { runAgent } from './llmAgent.js';

export async function executeScenario(steps) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const actions = await runAgent(page, steps);

    return {
      success: true,
      actions,
    };
  } catch (error) {
    return {
      success: false,
      error,
      actions: [],
    };
  } finally {
    await browser.close();
  }
}
