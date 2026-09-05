/** @type {import('knip').KnipConfig} */
export default {
  ignore: ['legacy/**'],
  entry: ['e2e/**/*.spec.ts', 'playwright.config.ts'],
  workspaces: {
    'packages/*': { project: ['src/**/*.ts'] },
    'apps/web': {
      entry: ['src/app/store/index.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'apps/gateway': { entry: ['src/index.ts'], project: ['src/**/*.ts'] },
    'tracers/*': { entry: ['src/index.ts'], project: ['src/**/*.ts'] },
    config: { project: ['src/**/*.ts'] },
  },
};
