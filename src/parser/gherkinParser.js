// src/parser/gherkinParser.js
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

export function parseFeature(content) {
  const newId = IdGenerator.uuid();

  const parser = new Parser(
    new AstBuilder(newId),
    new GherkinClassicTokenMatcher()
  );

  const gherkinDocument = parser.parse(content);

  const scenarios = gherkinDocument.feature.children
    .filter(c => c.scenario)
    .map(c => ({
      name: c.scenario.name,
      steps: c.scenario.steps.map(s => ({
        keyword: s.keyword.trim(),
        text: s.text,
      })),
    }));

  return { scenarios };
}
