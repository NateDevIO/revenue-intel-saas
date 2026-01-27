import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = '../docs/screenshots';

async function captureRiskInsight() {
  console.log('Capturing Revenue at Risk AI Insights...\n');

  await mkdir(`${__dirname}/${SCREENSHOTS_DIR}`, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/risk`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for page content to load
  await new Promise(r => setTimeout(r, 4000));

  // Scroll to bottom to find AI Insights panel
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 500));

  // Click the AI Insights header
  await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.textContent && el.textContent.includes('AI Insights') && el.classList.contains('cursor-pointer')) {
        el.click();
        return;
      }
    }
  });

  await new Promise(r => setTimeout(r, 500));

  // Click the Generate button
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Generate')) {
        btn.click();
        return;
      }
    }
  });

  console.log('Waiting for AI response (up to 90s)...');

  try {
    await page.waitForFunction(
      () => {
        const els = document.querySelectorAll('*');
        for (const el of els) {
          if (el.className && typeof el.className === 'string' && el.className.includes('from-purple-50') && el.textContent.includes('AI Analysis')) {
            return true;
          }
        }
        return false;
      },
      { timeout: 90000 }
    );
    console.log('AI response received!');
  } catch {
    console.log('Timed out waiting for response, capturing anyway...');
  }

  await new Promise(r => setTimeout(r, 1000));

  // Scroll to show the AI result
  await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.className && typeof el.className === 'string' && el.className.includes('from-purple-50')) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        return;
      }
    }
    window.scrollTo(0, document.body.scrollHeight);
  });

  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: `${__dirname}/${SCREENSHOTS_DIR}/ai-risk.png`,
    fullPage: false,
  });

  console.log('Saved to docs/screenshots/ai-risk.png');

  await browser.close();
}

captureRiskInsight().catch(console.error);
