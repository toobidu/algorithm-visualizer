import { type LanguageConfig } from '../types';

export const scala: LanguageConfig = {
  id: 'scala',
  name: 'Scala',
  ext: 'scala',
  monacoId: 'scala',
  pistonPackage: 'scala',
  pistonRuntime: 'scala',
  commentPrefix: '//',
  compileTimeoutMs: 45000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'AlgorithmVisualizer.scala',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'Main.scala',
};
