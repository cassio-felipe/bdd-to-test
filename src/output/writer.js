// src/output/writer.js
import fs from 'fs/promises';
import path from 'path';

export async function writeOutput(name, content) {
  const fileName = name.replace(/\s+/g, '_').toLowerCase();
  const dir = path.resolve('cypress/e2e');

  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${fileName}.cy.js`);

  await fs.writeFile(filePath, content);

  return filePath;
}
