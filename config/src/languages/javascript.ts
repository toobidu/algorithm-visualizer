import { type LanguageConfig } from '../types';

export const javascript: LanguageConfig = {
  id: 'javascript',
  name: 'JavaScript',
  ext: 'js',
  monacoId: 'javascript',
  pistonPackage: 'node',
  pistonRuntime: 'javascript',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'algorithm-visualizer.js',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.js',
};
