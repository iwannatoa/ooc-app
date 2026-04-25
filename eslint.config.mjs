import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noUnknownAs from './eslint-rules/no-unknown-as.js';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'no-unknown-as': noUnknownAs,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-unknown-as/no-unknown-as': 'error', // Custom rule to disallow 'as unknown as'
      'no-undef': 'off', // TypeScript handles this
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,mjs,ts}', 'vite.config.ts', 'vitest.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    ...jsxA11y.flatConfigs.recommended,
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      ...jsxA11y.flatConfigs.recommended.settings,
      'jsx-a11y': {
        polymorphicPropName: 'as',
      },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/test/**/*.{ts,tsx}',
    ],
    plugins: {
      'no-unknown-as': noUnknownAs,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Enforce proper typing even in tests
      '@typescript-eslint/no-unused-vars': 'warn', // Allow unused vars in tests
      'no-unknown-as/no-unknown-as': 'error', // Custom rule to disallow 'as unknown as'
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src-tauri/**',
      'playwright-report/**',
      'test-results/**',
      'server/**',
      'scripts/**',
    ],
  },
);
