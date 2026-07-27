// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// @cccd/shared is a symlink to ../packages/shared, which lives outside this
// project root. Metro does not follow symlinks out of the project by default,
// so the repo root must be watched explicitly or imports resolve to nothing.
config.watchFolders = [repoRoot];

// Resolve from the app first, then the repo root, so Expo's own copies win and
// React is not accidentally duplicated (two React instances break hooks).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules")
];

// The shared package ships TypeScript source rather than a build artifact, so
// Metro compiles it alongside app code.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
