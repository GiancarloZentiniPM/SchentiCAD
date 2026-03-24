import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "schenticad-v2.spec.ts",
  fullyParallel: false, // tests share state via Zustand stores
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5230",
    navigationTimeout: 120_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx vite --port 5230 --strictPort",
    port: 5230,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
