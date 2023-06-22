const path = require("path");

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: "../../.eslintrc.cjs",
  parserOptions: {
    project: path.join(__dirname, "tsconfig.json"),
  },
  ignorePatterns: ["dist/**", "node_modules/**", ".eslintrc.cjs"],
};

module.exports = config;
