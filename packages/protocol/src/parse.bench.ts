import { bench, describe } from 'vitest';
import { toChunks } from './chunk';
import { syntheticTrace, toStdout } from './fixtures';
import { parseStdout } from './parse';

// Nguong PLAN.md §4.3: parse 100.000 lệnh <= 250ms
const commands = syntheticTrace(100_000);
const stdout = toStdout(commands);

describe('protocol', () => {
  bench('parseStdout voi 100.000 lenh', () => {
    parseStdout(stdout);
  });

  bench('toChunks voi 100.000 lenh', () => {
    toChunks(commands);
  });
});
