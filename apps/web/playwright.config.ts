import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL, hasTouch: true, screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Hosts where `playwright install` is unsupported (e.g. macOS 13) can point at a local Chrome
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
          : {}),
      },
    },
    // iPad Safari is a primary editing device
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  // CI tests the production build (run `next build` first): dev-mode on-demand compilation
  // triggers Fast Refresh full reloads that interrupt navigations, notably in WebKit.
  webServer: {
    command: process.env.CI ? `npx next start --port ${port}` : `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
