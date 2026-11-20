// @ts-check
import js from '@eslint/js';
import css from '@eslint/css';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/', '.astro/', '.netlify/', 'legacy/', 'media/', 'node_modules/']),

  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    // Node-side code: build scripts, tests, config files
    files: ['scripts/**', 'tests/**', '*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },

  astro.configs.recommended,

  {
    // Native-first guard rail: CSS must be Baseline "widely available",
    // unless it sits behind @supports (progressive enhancement).
    files: ['**/*.css'],
    language: 'css/css',
    plugins: { css },
    extends: ['css/recommended'],
    rules: {
      'css/use-baseline': ['error', { available: 'widely' }],
      // Custom properties are defined once in tokens.css and used everywhere else.
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
    },
  },
]);
