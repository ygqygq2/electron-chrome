const sharedConfig = require("@ygqygq2/stylelint-config/index.cjs");
const { indentation: _indentation, ...sharedRules } = sharedConfig.rules ?? {};

module.exports = {
  ...sharedConfig,
  rules: sharedRules,
};
