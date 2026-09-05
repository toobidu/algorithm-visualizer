import { type LanguageConfig } from '../types';

export const racket: LanguageConfig = {
  id: 'racket',
  name: 'Racket',
  ext: 'rkt',
  monacoId: 'scheme',
  pistonPackage: 'racket',
  pistonRuntime: 'racket',
  commentPrefix: ';',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'algorithm-visualizer.rkt',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.rkt',
};
