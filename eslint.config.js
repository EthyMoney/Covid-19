import js from '@eslint/js';

// Flat config, required by ESLint 9+. This replaces the old .eslintrc.json, which had "sourceType"
// as a top-level property and therefore failed schema validation -- meaning the linter never actually
// ran on this project. The rules below are the ones the original config intended to enforce.
//
// The old "linebreak-style: windows" rule is deliberately gone: .gitattributes sets `* text=auto`,
// so git normalizes line endings on its own and pinning CRLF here just fights the checkout.

export default [
  {
    ignores: ['node_modules/**', 'sample-data/**', 'USstats.json', 'WorldStats.json']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      indent: ['warn', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single'],
      semi: ['error', 'always']
    }
  }
];
