const path = require("path");

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["../../.eslintrc.cjs", "next/core-web-vitals"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: path.join(__dirname, "tsconfig.json"),
  },
  ignorePatterns: ["node_modules/**", ".eslintrc.cjs", "jest.config.js"],
};

module.exports = config;
