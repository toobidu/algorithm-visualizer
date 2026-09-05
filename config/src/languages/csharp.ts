import { type LanguageConfig } from '../types';

export const csharp: LanguageConfig = {
  id: 'csharp',
  name: 'C#',
  ext: 'cs',
  monacoId: 'csharp',
  pistonPackage: 'dotnet',
  pistonRuntime: 'csharp',
  commentPrefix: '//',
  compileTimeoutMs: 15000,
  runTimeoutMs: 10_000,
  plainMode: 'none',
  tracerFileName: 'AlgorithmVisualizer.cs',
  tracerPlacement: 'separate-file',
  tracerIncludeLine: undefined,
  mainFileName: 'Main.cs',
};
