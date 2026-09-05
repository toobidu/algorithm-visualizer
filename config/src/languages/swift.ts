import { type LanguageConfig } from '../types';

export const swift: LanguageConfig = {
  id: 'swift',
  name: 'Swift',
  ext: 'swift',
  monacoId: 'swift',
  pistonPackage: 'swift',
  pistonRuntime: 'swift',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'AlgorithmVisualizer.swift',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'main.swift',
};
