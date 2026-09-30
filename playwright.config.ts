import { defineConfig, devices } from "@playwright/test";

// End-to-end run against a fresh local demo database (.data/e2e).
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    ...devices["iPhone 13"],
    browserName: "chromium",
    timezoneId: "Europe/Berlin",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    // E2E_PROD=1 runs against `next build` output (used for the screenshots in docs/).
    command: process.env.E2E_PROD ? "npx next start -p 3100" : "npx next dev -p 3100",
    url: "http://localhost:3100",
    timeout: 120_000,
    reuseExistingServer: false,
    env: { PGLITE_DIR: ".data/e2e", APP_URL: "http://localhost:3100", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
