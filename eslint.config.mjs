// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // 1) ignore files
  { ignores: ['dist', 'coverage', 'node_modules', 'eslint.config.mjs'] },

  // 2) JS rules for JS files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
    ...eslint.configs.recommended,
  },

  // 3) Type‑checked TS rules for TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // Either use projectService (TS 5+) OR explicit project
        projectService: true,
        // If you prefer explicit project reference instead:
        // project: ['./experimentalDecorators'],
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    // Recommended + type‑checked configs
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      // Optionally add strictTypeChecked if you want stricter rules:
      // ...tseslint.configs.strictTypeChecked,
    ],
    rules: {
      // reasonable defaults
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // keep this ON; with type info, decorators like @IsEnum should NOT trigger
      // '@typescript-eslint/no-unsafe-call': 'warn',
    },
  },

  // 4) Optional: if your repo still false‑flags decorator calls in DTOs,
  // scope-disable ONLY in DTO files (last resort).
  {
    files: ['src/**/dto/**/*.ts', 'src/**/*.input.ts', 'src/**/*.dto.ts'],
    rules: {
      // Comment OUT these if Step 3 already fixes the false positive.
      // '@typescript-eslint/no-unsafe-call': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // 5) Prettier plugin LAST so it can report formatting issues
  eslintPluginPrettierRecommended,
);
