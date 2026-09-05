import { type LanguageConfig } from '../types';

export const java: LanguageConfig = {
  id: 'java',
  name: 'Java',
  ext: 'java',
  monacoId: 'java',
  pistonPackage: 'java',
  pistonRuntime: 'java',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'AlgorithmVisualizer.java',
  tracerPlacement: 'append',
  tracerIncludeLine: undefined,
  mainFileName: 'Main.java',
};
