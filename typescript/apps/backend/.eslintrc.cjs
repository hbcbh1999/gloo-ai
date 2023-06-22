// const path = require("path");

// /** @type {import("eslint").Linter.Config} */
// const config = {
//   overrides: [
//     {
//       extends: [
//         "plugin:@typescript-eslint/recommended-requiring-type-checking",
//       ],
//       files: ["./src/**/*.(ts,tsx)"],
//       parserOptions: {
//         project: path.join(__dirname, "tsconfig.json"),
//       },
//     },
//   ],
//   parser: "@typescript-eslint/parser",
//   plugins: ["@typescript-eslint", "import"],
//   extends: ["plugin:@typescript-eslint/recommended"],
//   rules: {
//     "@typescript-eslint/consistent-type-imports": [
//       "error",
//       {
//         prefer: "type-imports",
//         fixStyle: "separate-type-imports",
//       },
//     ],
//     "no-unused-vars": "off",
//     "@typescript-eslint/no-unused-vars": [
//       "error",
//       {
//         varsIgnorePattern: "^_",
//         argsIgnorePattern: "^_",
//       },
//     ],
//     "@typescript-eslint/no-misused-promises": [
//       "error",
//       { checksVoidReturn: { attributes: false } },
//     ],
//     "import/no-unused-modules": "error",
//     "import/order": ["error", { "newlines-between": "always" }],
//     "import/no-named-as-default": "error",
//   },
//   parserOptions: {
//     project: path.join(__dirname, "tsconfig.json"),
//   },
//   ignorePatterns: [
//     "dist/**",
//     "node_modules/**",
//     ".eslintrc.cjs",
//     "src/api/generated/**",
//   ],
// };

// module.exports = config;
const config = require("../../packages/config/eslint-preset");

module.exports = {
  ...config,
  ignorePatterns: ["src/api/generated/**"],
};
