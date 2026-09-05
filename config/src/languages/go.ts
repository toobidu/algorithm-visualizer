import { type LanguageConfig } from '../types';

export const go: LanguageConfig = {
  id: 'go',
  name: 'Go',
  ext: 'go',
  monacoId: 'go',
  pistonPackage: 'go',
  pistonRuntime: 'go',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'algorithm_visualizer.go',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'main.go',
};
