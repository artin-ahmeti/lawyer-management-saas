// Root flat config shared by every workspace. Keep rules minimal in Phase 0;
// tighten per-package as real code lands.
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/.next/**',
      'supabase/**',
      '**/*.config.js',
      '**/babel.config.js',
      '**/metro.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // NestJS DI: classes referenced in constructor params must stay VALUE
    // imports or emitDecoratorMetadata erases them (guard learned the hard way).
    files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
);
