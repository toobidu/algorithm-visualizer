import { type LanguageConfig } from '../types';

export const php: LanguageConfig = {
  id: 'php',
  name: 'PHP',
  ext: 'php',
  monacoId: 'php',
  pistonPackage: 'php',
  pistonRuntime: 'php',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'AlgorithmVisualizer.php',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.php',
};
