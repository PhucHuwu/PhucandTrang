module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/LazyPageTextureManager.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: { target: 'ES2020', module: 'commonjs', esModuleInterop: true },
      diagnostics: false,
    }],
  },
};
