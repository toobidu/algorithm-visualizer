import { type LanguageConfig } from '../types';

export const kotlin: LanguageConfig = {
  id: 'kotlin',
  name: 'Kotlin',
  ext: 'kt',
  monacoId: 'kotlin',
  pistonPackage: 'kotlin',
  pistonRuntime: 'kotlin',
  commentPrefix: '//',
  compileTimeoutMs: 45000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'AlgorithmVisualizer.kt',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'Main.kt',
};
