import { parseFeature } from '../parser/gherkinParser.js';
import { executeScenario } from '../execution/playwrightEngine.js';
import { mapActions } from '../mapper/actionMapper.js';
import { generateCypress } from '../generator/cypressGenerator.js';
import { writeOutput } from '../output/writer.js';

export async function runPipeline(featureContent) {
  const ast = parseFeature(featureContent);
  const scenarios = [];

  for (const scenario of ast.scenarios) {
    const executionResult = await executeScenario(scenario.steps);

    if (!executionResult.success) {
      throw executionResult.error;
    }

    const mapped = mapActions(executionResult.actions);

    const code = generateCypress({
      name: scenario.name,
      steps: mapped,
    });

    const filePath = await writeOutput(scenario.name, code);

    scenarios.push({
      scenario: scenario.name,
      success: true,
      filePath,
    });
  }

  return scenarios;
}
