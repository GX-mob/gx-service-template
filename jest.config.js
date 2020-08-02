module.exports = {
  testEnvironment: "node",
  rootDir: "./",
  testMatch: ["**/*.(test|spec).(ts|tsx|js|jsx)"],
  modulePathIgnorePatterns: ["modules"],
  setupFiles: ["./jest.setup.js"],
  verbose: false,
  clearMocks: true,
  runner: "groups",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__fixtures__/",
    "/__tests__/",
    "/(__)?mock(s__)?/",
    "/__jest__/",
    ".?.min.js",
  ],
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleFileExtensions: ["js", "jsx", "json", "ts"],
};
