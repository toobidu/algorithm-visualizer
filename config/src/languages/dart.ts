import { type LanguageConfig } from '../types';

export const dart: LanguageConfig = {
  id: 'dart',
  name: 'Dart',
  ext: 'dart',
  monacoId: 'dart',
  pistonPackage: 'dart',
  pistonRuntime: 'dart',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm_visualizer.dart',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.dart',
};
