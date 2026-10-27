import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test against the real stack. Both servers are started automatically:
 * the backend with a temporary data directory so the user's experiments stay untouched.
 */
const BACKEND_PORT = 8011;
const FRONTEND_PORT = 5174;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: `uv run uvicorn medlab.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: "../backend",
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        MEDLAB_DATA_DIR: "../data-e2e",
        MEDLAB_CORS_ORIGINS: `["http://127.0.0.1:${FRONTEND_PORT}"]`,
      },
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${FRONTEND_PORT} --strictPort`,
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      env: { MEDLAB_BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}` },
      timeout: 60_000,
    },
  ],
});
