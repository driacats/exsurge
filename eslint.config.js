import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      eqeqeq: 'error',
      'no-console': 'off',
      'no-constant-condition': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // this port keeps the original var-based code as-is; converting to let/const
      // throughout is a separate stylistic pass, not part of the TS/tooling port
      'no-var': 'off',
      // Exsurge.Glyphs.ts is generated glyph coordinate data with long float
      // literals; the "lost" precision is sub-pixel and irrelevant to rendering
      'no-loss-of-precision': 'off',
    },
  },
  {
    ignores: ['dist/**', 'dist-demo/**', 'dist-types/**', 'node_modules/**'],
  }
);
