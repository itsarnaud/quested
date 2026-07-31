// Restricts the conventional-commits type list to what this repo actually
// uses (see `git log`), and keeps subjects single-line.
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "refactor", "test", "ci"]],
    "header-max-length": [2, "always", 100],
    "body-leading-blank": [0],
    "footer-leading-blank": [0],
  },
};
