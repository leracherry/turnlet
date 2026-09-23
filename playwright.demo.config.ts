import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './apps/demo/tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: {
    command:
      'npm run build && npm run preview --workspace @turnlet/demo -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
