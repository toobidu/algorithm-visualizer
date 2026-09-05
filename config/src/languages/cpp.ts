import { type LanguageConfig } from '../types';

export const cpp: LanguageConfig = {
  id: 'cpp',
  name: 'C++',
  ext: 'cpp',
  monacoId: 'cpp',
  pistonPackage: 'gcc',
  pistonRuntime: 'c++',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm-visualizer.h',
  tracerPlacement: 'inline',
  tracerIncludeLine: '#include "algorithm-visualizer.h"',
  mainFileName: 'code.cpp',
};
