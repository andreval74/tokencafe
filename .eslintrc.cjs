module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-empty": "off",
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-useless-escape": "off",
    "no-dupe-else-if": "off",
    "no-useless-catch": "off",
  },
  ignorePatterns: ["node_modules/", "dist/", "build/", "coverage/"],
};
