import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'legacy/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.generated.ts',
      'eslint.config.js',
      'prettier.config.js',
      'knip.config.js',
      'vitest.workspace.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // §5.9: nhung cach lam cong xanh ma khong giai quyet van de
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 20,
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],

      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-param-reassign': 'error',
      'prefer-const': 'error',

      // §5.9: khong de lai dau vet cong viec chua xong
      'no-warning-comments': [
        'error',
        { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'anywhere' },
      ],
    },
  },

  // Script build thuan JS: khong co tsconfig nen khong lint type-aware duoc.
  // Cac rule con lai (no-console, eqeqeq, ...) van ap dung binh thuong.
  {
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },

  // Rule cua React Hooks bat loi that: dependency thieu, hook goi trong nhanh dieu kien
  {
    files: ['apps/web/**/*.tsx', 'apps/web/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // Logger tap trung la noi duy nhat duoc phep goi console (§0.1.4)
  {
    files: ['apps/web/src/shared/lib/logger/**/*.ts', 'apps/gateway/src/lib/logger/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // §3.5 quy tac 6: viz-core khong duoc dung ngau nhien khong hat giong
  {
    files: ['packages/viz-core/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'viz-core phai dung PRNG co hat giong — xem PLAN.md §3.5 quy tac 6.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Khong dung thoi gian thuc trong viz-core: pha tinh tat dinh.' },
      ],
    },
  },

  // Test duoc noi long vai quy tac, nhung KHONG duoc noi long §5.9
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.bench.ts', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Test can dung ngau nhien va dong ho de KIEM CHUNG tinh tat dinh cua code that
      'no-restricted-properties': 'off',
      'no-restricted-globals': 'off',
    },
  },

  prettier,
);
