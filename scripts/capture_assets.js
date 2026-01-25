import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3003';
const SCREENSHOTS_DIR = '../docs/screenshots';

const pages = [
  { route: '/', name: 'dashboard' },
  { route: '/revenue', name: 'revenue' },
  { route: '/funnel', name: 'funnel' },
  { route: '/customers', name: 'customers' },
  { route: '/risk', name: 'risk' },
  { route: '/simulator', name: 'simulator' },
  { route: '/actions', name: 'actions' }
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');

  // Create screenshots directory
  await mkdir(`${__dirname}/${SCREENSHOTS_DIR}`, { recursive: true });
  console.log('✅ Created screenshots directory\n');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  const page = await browser.newPage();

  for (const { route, name } of pages) {
    try {
      console.log(`📸 Capturing ${name}...`);

      await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait 3 seconds for content to fully load and animations to complete
      await page.waitForTimeout(3000);

      const screenshotPath = `${__dirname}/${SCREENSHOTS_DIR}/${name}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });

      console.log(`   ✅ Saved to docs/screenshots/${name}.png\n`);
    } catch (error) {
      console.error(`   ❌ Failed to capture ${name}:`, error.message, '\n');
    }
  }

  await browser.close();
  console.log('🎉 Screenshot capture complete!');
}

captureScreenshots().catch(console.error);
