import electronConfig from "@ygqygq2/eslint-config/electron";

export default [
  ...electronConfig,
  {
    ignores: ["dist/**", "dist-electron/**", "release/**", "node_modules/**"]
  }
];
