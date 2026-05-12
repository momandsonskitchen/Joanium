import path from 'path';

// ─── Custom Rule: No Cross-Package Imports ────────────────────────────────────
// Enforces the core architecture rule: packages are microservices.
// A package may only import from itself, Packages/Shared, or Packages/Boot.
const noCrossPackageImports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent imports across packages. Use Packages/Shared for shared code.',
    },
    messages: {
      crossPackage:
        "'{{current}}' must not import from '{{imported}}'. Move shared code to Packages/Shared.",
    },
    schema: [],
  },
  create(context) {
    const filePath = context.filename.replace(/\\/g, '/');
    const packageMatch = filePath.match(/\/Packages\/([^/]+)\//);
    if (!packageMatch) return {};

    const currentPackage = packageMatch[1];
    const allowed = new Set(['Shared', 'Boot']);

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!source.startsWith('.')) return;

        const currentDir = path.dirname(context.filename);
        const resolved = path.resolve(currentDir, source).replace(/\\/g, '/');
        const importedMatch = resolved.match(/\/Packages\/([^/]+)\//);
        if (!importedMatch) return;

        const importedPackage = importedMatch[1];
        if (importedPackage === currentPackage || allowed.has(importedPackage)) return;

        context.report({
          node,
          messageId: 'crossPackage',
          data: { current: currentPackage, imported: importedPackage },
        });
      },
    };
  },
};

// ─── Custom Rule: No Hardcoded UI Strings ─────────────────────────────────────
// Warns when JSX-like template literals or innerHTML assignments contain
// plain sentence-like strings, which should come from I18n files instead.
const noHardcodedStrings = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage hardcoded user-facing strings. Use I18n files instead.',
    },
    messages: {
      hardcoded: 'Avoid hardcoded UI strings. Use the I18n module instead.',
    },
    schema: [],
  },
  create(context) {
    const filePath = context.filename.replace(/\\/g, '/');
    if (!filePath.includes('/Packages/')) return {};

    function isSentence(str) {
      return str.length > 20 && /[a-zA-Z]{4,}/.test(str) && /\s/.test(str.trim());
    }

    return {
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.name === 'textContent' &&
          node.right.type === 'Literal' &&
          typeof node.right.value === 'string' &&
          isSentence(node.right.value)
        ) {
          context.report({ node: node.right, messageId: 'hardcoded' });
        }
      },
    };
  },
};

// ─── ESLint Config ─────────────────────────────────────────────────────────────
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'Data/**', 'Build/**'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: {
      local: {
        rules: {
          'no-cross-package-imports': noCrossPackageImports,
          'no-hardcoded-strings': noHardcodedStrings,
        },
      },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // ── Architecture ───────────────────────────────────────────────────────
      'local/no-cross-package-imports': 'error',
      'local/no-hardcoded-strings': 'warn',

      // ── Correctness ────────────────────────────────────────────────────────
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-constant-condition': 'error',
      'no-promise-executor-return': 'error',
      'no-unmodified-loop-condition': 'error',

      // ── Security ───────────────────────────────────────────────────────────
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // ── Style / Best Practices ─────────────────────────────────────────────
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-console': 'warn',
      'no-alert': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-else-return': 'error',
    },
  },
];
