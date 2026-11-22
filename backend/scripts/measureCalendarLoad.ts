// Calendar load time measurement for NFR ID_033 (T103).
//   npm run measure:calendar   (from the repo root)
//
// NFR ID_033: seconds between requesting the events calendar and the first
// upcoming event being displayed, with 100 events stored. Must: at most 2 s.
//
// This script measures the server side of that time: it creates a temporary
// SQLite database with the demo data (T093) filled up to 100 events, starts
// the real HTTP API, logs in as a demo user and times GET /events/calendar
// (request, response and JSON parsing, as the app does) several times.
// Your local database is never touched. The full NFR meter (stopwatch on a
// device over Wi-Fi) is done by hand: see docs/nfr-ID_033-calendar-load-time.md.
//   npm run measure:calendar -- --serve
// then keeps the API running with these 100 events (port 3000, or PORT) for
// that device test, until Ctrl+C.
import { execSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/api/app';
import { todayInMontreal } from '../src/services/createEvent';
import { addDays, DEMO_PASSWORD, seedDemoData } from '../prisma/demoData';

const EVENTS_STORED = 100;
const RUNS = 30;
const MUST_MS = 2000;
const USER_EMAIL = 'alice.tremblay@mail.mcgill.ca';

const backendDir = path.resolve(__dirname, '..');
const dbPath = path.join(os.tmpdir(), `clubhouse-calendar-load-${process.pid}.db`);
const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;

/** Value at the given percentile (0-100) of sorted numbers. */
function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const ms = (value: number) => `${value.toFixed(1)} ms`;

/** Adds generated scheduled events (with some RSVPs) until EVENTS_STORED are stored. */
async function fillEvents(prisma: PrismaClient, today: string) {
  const missing = EVENTS_STORED - (await prisma.event.count());
  const clubs = await prisma.club.findMany({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });

  await prisma.event.createMany({
    data: Array.from({ length: missing }, (_, i) => {
      const hour = 9 + (i % 12);
      return {
        clubId: clubs[i % clubs.length].id,
        title: `Load Test Event ${String(i + 1).padStart(3, '0')}`,
        category: 'Academic',
        date: addDays(today, 1 + (i % 90)),
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String(hour + 1).padStart(2, '0')}:00`,
        location: 'McConnell 103',
        capacity: 50,
        status: 'SCHEDULED' as const,
      };
    }),
  });

  // The calendar counts the attendees of each event: give it RSVPs to count
  const users = await prisma.account.findMany({ where: { role: 'USER' } });
  const events = await prisma.event.findMany({ where: { status: 'SCHEDULED' }, select: { id: true } });
  await prisma.rSVP.createMany({
    data: events.flatMap((event, i) =>
      users.map((user) => ({
        accountId: user.id,
        eventId: event.id,
        response: i % 2 === 0 ? ('ATTENDING' as const) : ('NOT_ATTENDING' as const),
      })),
    ),
  });
}

async function main() {
  console.log('Creating a temporary database with 100 events...');
  execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const server = createApp(prisma).listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const today = todayInMontreal(new Date());
    await seedDemoData(prisma, today);
    await fillEvents(prisma, today);

    const stored = await prisma.event.count();
    const upcoming = await prisma.event.count({ where: { status: 'SCHEDULED', date: { gte: today } } });

    const login = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USER_EMAIL, password: DEMO_PASSWORD }),
    });
    if (!login.ok) throw new Error(`Login failed: ${login.status}`);
    const { token } = (await login.json()) as { token: string };

    // Each run: request the calendar and read the events, as the app does
    const times: number[] = [];
    let payloadBytes = 0;
    let firstEvent = '';

    for (let run = 0; run < RUNS; run++) {
      const start = performance.now();
      const response = await fetch(`${base}/events/calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await response.text();
      const { events } = JSON.parse(text) as { events: { title: string; date: string }[] };
      times.push(performance.now() - start);

      if (!response.ok || events.length !== upcoming) {
        throw new Error(`Run ${run + 1}: got ${events.length} events, expected ${upcoming}`);
      }
      payloadBytes = Buffer.byteLength(text);
      firstEvent = `${events[0].title} (${events[0].date})`;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const max = sorted[sorted.length - 1];
    const passed = max <= MUST_MS;

    console.log(`
NFR ID_033 Calendar Load Time - server side (GET /events/calendar)
  Date:             ${new Date().toISOString()}
  Machine:          ${os.type()} ${os.release()}, ${os.cpus()[0]?.model.trim() ?? 'unknown CPU'}, Node ${process.version}
  Events stored:    ${stored} (${upcoming} upcoming scheduled, all returned)
  First event:      ${firstEvent}
  Payload:          ${(payloadBytes / 1024).toFixed(1)} KB
  Runs:             ${RUNS}
  First request:    ${ms(times[0])}
  Median:           ${ms(percentile(sorted, 50))}
  95th percentile:  ${ms(percentile(sorted, 95))}
  Max:              ${ms(max)}
  Must (<= ${MUST_MS} ms): ${passed ? 'MET' : 'NOT MET'}`);

    if (!passed) process.exitCode = 1;

    if (process.argv.includes('--serve')) {
      // Same database, reachable from a phone on the same Wi-Fi network
      const port = Number(process.env.PORT ?? 3000);
      const deviceServer = createApp(prisma).listen(port, '0.0.0.0');
      await once(deviceServer, 'listening');
      console.log(`
API running on port ${port} with these ${stored} events, for the device stopwatch test.
Log in as ${USER_EMAIL} (password ${DEMO_PASSWORD}). Press Ctrl+C to stop.`);
      await once(process, 'SIGINT');
      deviceServer.close();
    }
  } finally {
    server.close();
    await prisma.$disconnect();
    for (const file of [dbPath, `${dbPath}-journal`]) fs.rmSync(file, { force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
