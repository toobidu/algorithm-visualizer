import { type LanguageConfig } from '../types';

export const typescript: LanguageConfig = {
  id: 'typescript',
  name: 'TypeScript',
  ext: 'ts',
  monacoId: 'typescript',
  pistonPackage: 'typescript',
  pistonRuntime: 'typescript',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'algorithm-visualizer.ts',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.ts',
};
