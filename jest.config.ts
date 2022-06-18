export default {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts)$": "ts-jest",
  },
  testMatch: ["**/tests/**/*.spec.ts", "**/tests/**/*.test.ts"],
  testEnvironment: "node",
};
