import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      channel: process.env.PIXELCOVER_E2E_CHANNEL,
      launchOptions: { chromiumSandbox: true },
    },
  }],
  webServer: {
    command: "npm exec -- vite --host 127.0.0.1 --port 4173 --strictPort",
    url: baseURL + "/tests/e2e/fixtures/engine.html",
  },
});
