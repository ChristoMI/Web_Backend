module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  extends: [
    'airbnb-base',
    // 'plugin:@typescript-eslint/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'max-len': ["error", { "code": 130, "comments": 200 }],
    'linebreak-style': 'off',
    'eol-last': ['error', 'never'],
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'prefer-destructuring': 'off',
    'indent': ['error', 2],
    "no-unused-vars": "off",
    "no-unused-expressions": "off",
    "no-restricted-syntax": "off",
    "max-classes-per-file": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    'camelcase': 'off',
    'arrow-parens': 'off',
    'no-plusplus': 'off'
  },
};