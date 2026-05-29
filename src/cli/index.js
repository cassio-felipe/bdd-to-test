// src/cli/index.js
import fs from 'fs';
import { runPipeline } from '../core/pipeline.js';

const file = process.argv[2];

if (!file) {
  console.error('Informe um arquivo .feature');
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf-8');

runPipeline(content)
  .then(result => {
    console.log('✅ Testes gerados:', result);
  })
  .catch(err => {
    console.error('❌ Erro:', err);
  });
