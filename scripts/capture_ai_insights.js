import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = '../docs/screenshots';

const aiPages = [
  { route: '/', name: 'ai-executive', title: 'Executive Dashboard' },
  { route: '/risk', name: 'ai-risk', title: 'Revenue at Risk' },
  { route: '/funnel', name: 'ai-funnel', title: 'Funnel Analysis' },
  { route: '/simulator', name: 'ai-simulator', title: 'What-If Simulator' },
  { route: '/revenue', name: 'ai-revenue', title: 'Revenue Intelligence' },
];

async function captureAIInsights() {
  console.log('Starting AI Insights screenshot capture...\n');

  await mkdir(`${__dirname}/${SCREENSHOTS_DIR}`, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();

  for (const { route, name, title } of aiPages) {
    try {
      console.log(`Capturing ${title}...`);

      await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for page content to load
      await new Promise(r => setTimeout(r, 3000));

      // Find and click the AI Insights card header to expand it
      const clicked = await page.evaluate(() => {
        const headers = document.querySelectorAll('[class*="CardHeader"]');
        for (const header of headers) {
          if (header.textContent.includes('AI Insights')) {
            header.click();
            return true;
          }
        }
        // Fallback: look for text containing "AI Insights"
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el.textContent.includes('AI Insights') && el.classList.contains('cursor-pointer')) {
            el.click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) {
        console.log(`   Could not find AI Insights panel on ${title}, skipping...`);
        continue;
      }

      // Wait for panel to expand
      await new Promise(r => setTimeout(r, 500));

      // Click the "Generate" button
      const buttonClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Generate')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!buttonClicked) {
        console.log(`   Could not find Generate button on ${title}`);
      }

      // Wait for Claude API response (can take up to 30s)
      console.log(`   Waiting for AI response...`);
      try {
        await page.waitForFunction(
          () => {
            const el = document.querySelector('[class*="from-purple-50"]');
            return el && el.textContent.includes('AI Analysis');
          },
          { timeout: 60000 }
        );
      } catch {
        console.log(`   AI response timed out, capturing current state...`);
      }

      // Wait a bit more for rendering
      await new Promise(r => setTimeout(r, 1000));

      // Scroll to the AI insights section
      await page.evaluate(() => {
        const el = document.querySelector('[class*="from-purple-50"]');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        } else {
          // Scroll to bottom where insights panel is
          window.scrollTo(0, document.body.scrollHeight);
        }
      });

      await new Promise(r => setTimeout(r, 500));

      const screenshotPath = `${__dirname}/${SCREENSHOTS_DIR}/${name}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`   Saved to docs/screenshots/${name}.png\n`);
    } catch (error) {
      console.error(`   Failed to capture ${title}:`, error.message, '\n');
    }
  }

  await browser.close();
  console.log('AI Insights screenshot capture complete!');
}

captureAIInsights().catch(console.error);
