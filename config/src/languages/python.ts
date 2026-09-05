import { type LanguageConfig } from '../types';

export const python: LanguageConfig = {
  id: 'python',
  name: 'Python',
  ext: 'py',
  monacoId: 'python',
  pistonPackage: 'python',
  pistonRuntime: 'python',
  commentPrefix: '#',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'algorithm_visualizer.py',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.py',
};
