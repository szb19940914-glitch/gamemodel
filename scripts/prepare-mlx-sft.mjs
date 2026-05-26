import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const inputFile = process.env.INPUT_JSONL || 'eval/sft-runner.jsonl';
const outDir = process.env.OUT_DIR || 'mlx-data/runner-lora';
const trainRatio = Number(process.env.TRAIN_RATIO || '0.9');
const format = process.env.FORMAT || 'chat';

const inputPath = path.join(ROOT, inputFile);
const outputPath = path.join(ROOT, outDir);
const trainPath = path.join(outputPath, 'train.jsonl');
const validPath = path.join(outputPath, 'valid.jsonl');

const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n').filter(Boolean);
const rows = lines.map((line, index) => {
  const row = JSON.parse(line);
  if (!Array.isArray(row.messages) || row.messages.length !== 3) {
    throw new Error(`line ${index + 1}: expected messages[3]`);
  }
  const [system, user, assistant] = row.messages;
  if (system.role !== 'system' || user.role !== 'user' || assistant.role !== 'assistant') {
    throw new Error(`line ${index + 1}: invalid message roles`);
  }

  JSON.parse(assistant.content);

  if (format === 'text') {
    return {
      text: [
        '<|im_start|>system',
        system.content.trim(),
        '<|im_end|>',
        '<|im_start|>user',
        user.content.trim(),
        '<|im_end|>',
        '<|im_start|>assistant',
        assistant.content.trim(),
        '<|im_end|>',
      ].join('\n'),
    };
  }

  return {
    messages: [
      { role: 'system', content: system.content.trim() },
      { role: 'user', content: user.content.trim() },
      { role: 'assistant', content: assistant.content.trim() },
    ],
  };
});

const trainCount = Math.max(1, Math.min(rows.length - 1, Math.round(rows.length * trainRatio)));
const train = rows.slice(0, trainCount);
const valid = rows.slice(trainCount);

fs.mkdirSync(outputPath, { recursive: true });
fs.writeFileSync(trainPath, train.map((row) => JSON.stringify(row)).join('\n') + '\n');
fs.writeFileSync(validPath, valid.map((row) => JSON.stringify(row)).join('\n') + '\n');

console.log(`input: ${inputFile}`);
console.log(`output: ${outDir}`);
console.log(`format: ${format}`);
console.log(`train: ${train.length} -> ${path.relative(ROOT, trainPath)}`);
console.log(`valid: ${valid.length} -> ${path.relative(ROOT, validPath)}`);
