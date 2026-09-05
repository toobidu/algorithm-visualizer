import { type LanguageConfig } from '../types';

export const elixir: LanguageConfig = {
  id: 'elixir',
  name: 'Elixir',
  ext: 'ex',
  monacoId: 'elixir',
  pistonPackage: 'elixir',
  pistonRuntime: 'elixir',
  commentPrefix: '#',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm_visualizer.ex',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.ex',
};
