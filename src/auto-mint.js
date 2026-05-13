const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const METAMASK_ID = process.env.PFF_METAMASK_ID || 'nkbihfbeogaeaoehlefnkodbefgpgknn';
const SITE_URL = process.env.PFF_URL || 'https://pffthash.com/';
const POLL_MS = Number(process.env.PFF_POLL_MS || 3000);
const CONFIRM_DELAY_MS = Number(process.env.PFF_CONFIRM_DELAY_MS || 1200);
const DRY_RUN = process.env.PFF_DRY_RUN === '1';
const USE_CHROME_DEFAULT = process.env.PFF_USE_CHROME_DEFAULT === '1';
const CDP_URL = process.env.PFF_CDP_URL || '';
const USING_CDP = Boolean(CDP_URL);

const chromeExe = process.env.PFF_CHROME_EXE || firstExisting([
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]);

const defaultChromeUserData = path.join(
  process.env.LOCALAPPDATA || '',
  'Google',
  'Chrome',
  'User Data'
);

const userDataDir = process.env.PFF_CHROME_USER_DATA_DIR ||
  (USE_CHROME_DEFAULT ? defaultChromeUserData : path.join(process.cwd(), '.chrome-profile'));

const chromeProfile = process.env.PFF_CHROME_PROFILE || 'Default';
const extensionPath = process.env.PFF_METAMASK_EXTENSION_PATH || findInstalledMetaMask(defaultChromeUserData);

function firstExisting(paths) {
  return paths.find((item) => item && fs.existsSync(item));
}

function findInstalledMetaMask(chromeUserData) {
  const extensionRoot = path.join(chromeUserData, 'Default', 'Extensions', METAMASK_ID);
  if (!fs.existsSync(extensionRoot)) return '';

  const versions = fs.readdirSync(extensionRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return versions.length ? path.join(extensionRoot, versions[0]) : '';
}

function now() {
  return new Date().toLocaleString();
}

function log(message) {
  console.log(`[${now()}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickLocator(locator, label) {
  const count = await locator.count().catch(() => 0);
  if (!count) return false;

  const target = locator.first();
  const visible = await target.isVisible().catch(() => false);
  const enabled = await target.isEnabled().catch(() => false);
  if (!visible || !enabled) return false;

  if (DRY_RUN) {
    log(`[dry-run] would click: ${label}`);
    return true;
  }

  await target.click({ timeout: 5000 });
  log(`clicked: ${label}`);
  return true;
}

async function clickMetaMaskConfirm(page) {
  if (!page.url().startsWith(`chrome-extension://${METAMASK_ID}/`)) return false;

  await page.bringToFront().catch(() => {});
  await sleep(CONFIRM_DELAY_MS);

  const zhConfirm = String.fromCharCode(0x786e, 0x8ba4);
  const zhApprove = String.fromCharCode(0x6279, 0x51c6);
  const confirmSelectors = [
    'button[data-testid="confirm-footer-button"]',
    'button[data-testid="page-container-footer-next"]',
    'button[data-testid="confirmation-submit-button"]',
    'button:has-text("Confirm")',
    `button:has-text("${zhConfirm}")`,
    'button:has-text("Approve")',
    `button:has-text("${zhApprove}")`
  ];

  for (const selector of confirmSelectors) {
    if (await clickLocator(page.locator(selector), `MetaMask ${selector}`)) {
      return true;
    }
  }

  return false;
}

async function clickBackHome(page) {
  const backHomeText = /\u56de\u5230\u9996\u9875|\u8fd4\u56de\u9996\u9875|Back\s*Home|Home|Go\s*Home/i;
  const locators = [
    page.getByRole('button', { name: backHomeText }),
    page.getByText(backHomeText),
    page.locator('button:has-text("Home")'),
    page.locator('a:has-text("Home")')
  ];

  for (const locator of locators) {
    if (await clickLocator(locator, 'site back-home')) return true;
  }

  return false;
}

async function clickMintButton(page) {
  await page.bringToFront().catch(() => {});

  if (DRY_RUN) {
    log('[dry-run] would click: #mintBtn');
    return true;
  }

  const box = await page.evaluate(() => {
    const btn = document.getElementById('mintBtn');
    if (!btn) return null;
    btn.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = btn.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      text: btn.textContent.trim(),
      html: btn.innerHTML,
      disabled: Boolean(btn.disabled),
      pointerEvents: getComputedStyle(btn).pointerEvents,
      visibility: getComputedStyle(btn).visibility,
      display: getComputedStyle(btn).display,
    };
  });

  log(`mint button state before click: ${JSON.stringify(box)}`);

  try {
    await page.locator('#mintBtn').click({ timeout: 5000, force: true });
    log('clicked: site #mintBtn via Playwright');
  } catch (error) {
    log(`Playwright #mintBtn click failed: ${error.message}`);
  }

  await sleep(800);

  const stillReady = await page.evaluate(() => {
    const btn = document.getElementById('mintBtn');
    return Boolean(btn && (btn.innerHTML === 'Sign &amp; Mint' || btn.textContent.trim() === 'Sign & Mint'));
  });

  if (!stillReady) return true;

  log('mint button still ready after Playwright click, trying DOM btn.click()');
  const domClicked = await page.evaluate(() => {
    const btn = document.getElementById('mintBtn');
    if (!btn) return false;
    btn.click();
    return true;
  });

  if (domClicked) {
    log('clicked: site #mintBtn via DOM');
    return true;
  }

  return false;
}

async function chooseSitePage(context) {
  const pages = context.pages();
  for (const [index, page] of pages.entries()) {
    const title = await page.title().catch(() => '');
    log(`page[${index}]: ${title || '(no title)'} ${page.url()}`);
  }

  const sitePages = pages.filter((page) => page.url().startsWith('https://pffthash.com'));
  if (sitePages.length) return sitePages[sitePages.length - 1];

  return context.newPage();
}

async function getBrowserContext() {
  if (CDP_URL) {
    log(`connecting to Chrome over CDP: ${CDP_URL}`);
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0];
    if (!context) throw new Error('No Chrome context found from CDP connection.');
    return context;
  }

  if (!chromeExe) {
    throw new Error('Chrome/Edge not found. Set PFF_CHROME_EXE to chrome.exe or msedge.exe.');
  }

  const args = [
    '--disable-blink-features=AutomationControlled',
  ];

  if (USE_CHROME_DEFAULT) {
    args.push(`--profile-directory=${chromeProfile}`);
  } else if (extensionPath && fs.existsSync(extensionPath)) {
    args.push(`--disable-extensions-except=${extensionPath}`);
    args.push(`--load-extension=${extensionPath}`);
  }

  log(`browser: ${chromeExe}`);
  log(`profile dir: ${userDataDir}`);
  if (!USE_CHROME_DEFAULT && extensionPath) log(`loading MetaMask extension: ${extensionPath}`);
  if (DRY_RUN) log('dry-run enabled: no clicks will be sent');

  return chromium.launchPersistentContext(userDataDir, {
    executablePath: chromeExe,
    headless: false,
    args,
    viewport: { width: 1280, height: 900 },
  });
}

async function main() {
  const context = await getBrowserContext();

  context.on('page', (page) => {
    page.on('domcontentloaded', async () => {
      if (page.url().startsWith(`chrome-extension://${METAMASK_ID}/`)) {
        log(`MetaMask page opened: ${page.url()}`);
        await clickMetaMaskConfirm(page).catch((error) => log(`MetaMask click failed: ${error.message}`));
      }
    });
  });

  let sitePage = await chooseSitePage(context);

  if (!USING_CDP || !sitePage.url().startsWith('https://pffthash.com')) {
    await sitePage.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
  } else {
    await sitePage.bringToFront().catch(() => {});
  }

  log(`using site page: ${await sitePage.title().catch(() => '')} ${sitePage.url()}`);
  log('Unlock MetaMask manually and make sure the site is connected. The script will keep polling.');

  let mintInProgress = false;
  let metaMaskCheckRunning = false;

  setInterval(async () => {
    if (metaMaskCheckRunning) return;
    metaMaskCheckRunning = true;

    try {
      for (const page of context.pages()) {
        const confirmed = await clickMetaMaskConfirm(page).catch((error) => {
          log(`MetaMask check failed: ${error.message}`);
          return false;
        });

        if (confirmed) {
          mintInProgress = false;
          log('MetaMask confirmed. Continue polling pffthash for the next round.');
        }
      }
    } finally {
      metaMaskCheckRunning = false;
    }
  }, 1000);

  while (true) {
    try {
      if (sitePage.isClosed()) throw new Error('Site page is closed.');

      if (mintInProgress) {
        await clickBackHome(sitePage);
      }

      const mintReady = await sitePage.evaluate(() => {
        const btn = document.getElementById('mintBtn');
        if (!btn) return { ready: false, html: '', text: '' };

        return {
          ready: btn.innerHTML === 'Sign &amp; Mint' || btn.textContent.trim() === 'Sign & Mint',
          html: btn.innerHTML,
          text: btn.textContent.trim()
        };
      });

      if (mintReady.ready && !mintInProgress) {
        log(`mint button ready: ${mintReady.text || mintReady.html}`);
        mintInProgress = await clickMintButton(sitePage);
      }
    } catch (error) {
      log(`loop error: ${error.message}`);
    }

    await sleep(POLL_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
