import { type LanguageConfig } from '../types';

export const erlang: LanguageConfig = {
  id: 'erlang',
  name: 'Erlang',
  ext: 'erl',
  monacoId: 'erlang',
  pistonPackage: 'erlang',
  pistonRuntime: 'erlang',
  commentPrefix: '%',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm_visualizer.erl',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.erl',
};
