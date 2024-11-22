export default [
  {
    ignorePatterns: [""], // The ! means "don't ignore"
    rules: {
      "no-unused-expressions": 0,
      "no-unread-variable": 0,
    },
  },
  {
    files: ["*-test.js", "*.spec.js"],
    rules: {
      "no-unused-expressions": "off",
    },
  },
];
