import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pages',
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: 'http://127.0.0.1:4177/turnlet/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm run build --workspace turnlet && npm run build --workspace @turnlet/demo -- --base=/turnlet/ && npm run preview --workspace @turnlet/demo -- --base=/turnlet/ --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177/turnlet/',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
