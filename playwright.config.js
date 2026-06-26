/** @type {import('@playwright/test').PlaywrightTestConfig} */
const PORT = process.env.TIMELINEFORGE_TEST_PORT || process.env.CHRONICLE_TEST_PORT || '8080';

export default {
  testDir: 'tests/e2e',
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: process.env.TIMELINEFORGE_NO_SERVER || process.env.CHRONICLE_NO_SERVER
    ? undefined
    : {
        command: `python3 -m http.server ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: true,
        timeout: 120000,
      },
};
