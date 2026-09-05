import { type LanguageConfig } from '../types';

export const rust: LanguageConfig = {
  id: 'rust',
  name: 'Rust',
  ext: 'rs',
  monacoId: 'rust',
  pistonPackage: 'rust',
  pistonRuntime: 'rust',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm_visualizer.rs',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.rs',
};
