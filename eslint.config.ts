import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'cli/payload/**', 'cli/dist/**', 'cli/test/fixture*/**']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // The package reads untyped JSON (tsconfig, package.json, the manifest). Meridian's scripts carry their own
    // exception in the files that need one, so the rule holds wherever a project copies them.
    files: ['cli/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Tests stand fakes in for a model, a transport or a store; casting a fake to the real type is the point of it.
    files: ['tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
]);

export default eslintConfig;
