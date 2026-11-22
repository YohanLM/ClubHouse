// Calendar load time of the app, in a browser (NFR ID_033, T103).
// Measures, in headless Chrome, the time between tapping the Events tab of
// the web version of the app and the first upcoming event being displayed,
// with 100 events stored. Runs 10 trials per profile: the computer as is, an
// emulated phone on Wi-Fi, and Lighthouse's mobile profile as a worst case.
//
// Needs Chrome, and in two other terminals (from the repo root):
//   npm run measure:calendar -- --serve      (API with 100 events on :3000)
//   cd app && npx expo start --web --port 8081
// Then:
//   node backend/scripts/measureCalendarLoadInBrowser.mjs ["path/to/chrome"]
// Uses only Node (built-in fetch and WebSocket) and the Chrome DevTools Protocol.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const APP = 'http://localhost:8081';
const USER = { email: 'alice.tremblay@mail.mcgill.ca', password: 'Passw0rd!23' };
const FIRST_EVENT = 'Load Test Event 001';
const TRIALS = 10;
const MUST_MS = 2000;
const DEBUG_PORT = 9333;

const PROFILES = [
  { name: 'Computer (no throttling)', cpu: 1, net: null },
  { name: 'Emulated phone on Wi-Fi (CPU 4x slower, 40 ms latency, 10 Mbit/s)', cpu: 4,
    net: { latency: 40, down: 10e6 / 8, up: 5e6 / 8 } },
  { name: 'Worst case: Lighthouse mobile (CPU 4x slower, 150 ms latency, 1.6 Mbit/s)', cpu: 4,
    net: { latency: 150, down: 1.6e6 / 8, up: 0.75e6 / 8 } },
];

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const chromePath = process.argv[2] ?? CHROME_PATHS.find((p) => fs.existsSync(p));
if (!chromePath) throw new Error('Chrome not found: pass its path as the first argument');

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubhouse-chrome-'));
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
  '--window-size=412,915', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

// ---------- Chrome DevTools Protocol ----------

async function pageWebSocketUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await pageWebSocketUrl());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (message) => {
  const msg = JSON.parse(message.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  if (msg.error) reject(new Error(JSON.stringify(msg.error)));
  else resolve(msg.result);
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function waitFor(expression, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const pageHas = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;

/** Real mouse click (pointer events) on the deepest element showing exactly this text. */
async function clickText(label) {
  const point = await evaluate(`(() => {
    const els = [...document.querySelectorAll('body *')]
      .filter(e => e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!point) throw new Error(`No element with the text "${label}"`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  }
}

async function typeInto(ariaLabel, text) {
  await evaluate(`document.querySelector('input[aria-label=${JSON.stringify(ariaLabel)}]').focus()`);
  await send('Input.insertText', { text });
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------- Measurement ----------

let failed = false;
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.navigate', { url: APP });
  await waitFor(`document.body && ${pageHas('Events')}`, 120000);

  // Log in through the Log In tab, as a user would
  await clickText('Log In');
  await waitFor(`!!document.querySelector('input[aria-label="McGill email"]')`);
  await typeInto('McGill email', USER.email);
  await typeInto('Password', USER.password);
  await clickText('Log in');
  await sleep(2500);

  await clickText('Events');
  await waitFor(pageHas(FIRST_EVENT));
  console.log(`Logged in as ${USER.email}; the Events tab shows "${FIRST_EVENT}" first.`);

  for (const profile of PROFILES) {
    await send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
    await send('Network.emulateNetworkConditions', profile.net
      ? { offline: false, latency: profile.net.latency, downloadThroughput: profile.net.down, uploadThroughput: profile.net.up }
      : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    const times = [];
    for (let trial = 0; trial < TRIALS; trial++) {
      // Leave the Events tab, so that it loads the calendar again when tapped
      await clickText('Clubs');
      await waitFor(`!${pageHas(FIRST_EVENT)}`);
      await sleep(profile.net ? 1500 : 500);

      // Start: the press on the Events tab. Stop: the frame after the first
      // event appears in the page, i.e. once it has been painted.
      await evaluate(`window.__probe = new Promise(resolve => {
        window.__t0 = null;
        document.addEventListener('pointerdown', () => { window.__t0 = performance.now(); }, { capture: true, once: true });
        const observer = new MutationObserver(() => {
          if (window.__t0 !== null && ${pageHas(FIRST_EVENT)}) {
            observer.disconnect();
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - window.__t0)));
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }); true`);
      await clickText('Events');
      times.push(await evaluate('window.__probe'));
    }

    const max = Math.max(...times);
    if (max > MUST_MS) failed = true;
    console.log(`\n${profile.name}
  trials (ms): ${times.map((t) => t.toFixed(0)).join(', ')}
  median: ${median(times).toFixed(0)} ms, min: ${Math.min(...times).toFixed(0)} ms, max: ${max.toFixed(0)} ms
  Must (<= ${MUST_MS} ms): ${max <= MUST_MS ? 'MET' : 'NOT MET'}`);
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(500);
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

if (failed) process.exitCode = 1;
