import fs from 'node:fs';

const file = process.argv[2] || 'eval/sft-runner.jsonl';
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (err) {
    throw new Error(`Invalid JSON on line ${index + 1}: ${err.message}`);
  }
});

const byDifficulty = new Map();
const byEnsemble = new Map();
const ids = new Set();
let duplicateIds = 0;
let invalid = 0;
let totalChars = 0;
let maxChars = 0;

for (const row of rows) {
  if (ids.has(row.id)) duplicateIds++;
  ids.add(row.id);

  if (!Array.isArray(row.messages) || row.messages.length !== 3) invalid++;
  const [system, user, assistant] = row.messages || [];
  if (system?.role !== 'system' || user?.role !== 'user' || assistant?.role !== 'assistant') invalid++;

  let config;
  try {
    config = JSON.parse(assistant?.content || '');
  } catch {
    invalid++;
  }

  const difficulty = config?.meta?.difficulty || 'unknown';
  byDifficulty.set(difficulty, (byDifficulty.get(difficulty) || 0) + 1);
  byEnsemble.set(row.ensemble || 'unknown', (byEnsemble.get(row.ensemble || 'unknown') || 0) + 1);

  const chars = JSON.stringify(row.messages).length;
  totalChars += chars;
  maxChars = Math.max(maxChars, chars);
}

const obj = (map) => Object.fromEntries([...map.entries()].sort());

console.log(`file: ${file}`);
console.log(`samples: ${rows.length}`);
console.log(`duplicate_ids: ${duplicateIds}`);
console.log(`invalid_rows: ${invalid}`);
console.log(`difficulty: ${JSON.stringify(obj(byDifficulty))}`);
console.log(`ensemble: ${JSON.stringify(obj(byEnsemble))}`);
console.log(`avg_message_chars: ${Math.round(totalChars / Math.max(rows.length, 1))}`);
console.log(`max_message_chars: ${maxChars}`);
