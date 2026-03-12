import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    headless: false, // Extensions require headed mode
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname, 'dist')}`,
            `--load-extension=${path.resolve(__dirname, 'dist')}`,
          ],
        },
      },
    },
  ],
});
