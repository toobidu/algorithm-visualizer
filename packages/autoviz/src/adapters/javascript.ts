import { type PlainAdapter, type PlainProgram } from '../adapter';
import { instrumentBraces, NEWLINE, type BraceDialect } from '../instrumentBraces';

const dialect: BraceDialect = {
  comment: '//',
  declaration: [/(?:^\s*|[;{(]\s*)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g],
  innerScoped: [/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g],
  // Bắt cả `function f(a, b) {` lẫn arrow `const f = (a, b) => {`
  params: /\(([^)]*)\)\s*(?:=>\s*\{?|\{)\s*$/,
  skipPrefixes: ['return', 'throw', 'import ', 'export ', 'class ', 'function '],
  emit: (line, names) => `__avStep(${String(line)}, {${names.join(', ')}});`,
};

export const javascriptAdapter: PlainAdapter = {
  languageId: 'javascript',
  strategy: 'source-instrumentation',
  runtimeFile: undefined,

  build(userCode): PlainProgram {
    const { lines } = instrumentBraces(userCode, dialect);
    return { files: [{ name: 'main.js', content: lines.join(NEWLINE) }], lineOffset: 0 };
  },
};

export const typescriptAdapter: PlainAdapter = {
  ...javascriptAdapter,
  languageId: 'typescript',
};
