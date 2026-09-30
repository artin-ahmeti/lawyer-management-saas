// Root flat config shared by every workspace. Keep rules minimal in Phase 0;
// tighten per-package as real code lands.
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

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
      'design/**', // design-system sources/previews: plain HTML/CSS/py, not app code
      '.ds-sync/**',
      'ds-bundle/**',
      '.design-sync/**',
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
    // Next.js app: React hooks rules + Next's core-web-vitals checks.
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
    settings: { next: { rootDir: 'apps/web' } },
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
