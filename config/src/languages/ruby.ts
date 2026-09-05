import { type LanguageConfig } from '../types';

export const ruby: LanguageConfig = {
  id: 'ruby',
  name: 'Ruby',
  ext: 'rb',
  monacoId: 'ruby',
  pistonPackage: 'ruby',
  pistonRuntime: 'ruby',
  commentPrefix: '#',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'full',
  tracerFileName: 'algorithm_visualizer.rb',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'code.rb',
};
