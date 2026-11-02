// HTTP API used by the mobile app. Each route calls one service from
// src/services and sends its result back as JSON:
//   success -> 200 with the data, failure -> 4xx with { message }.
// Add the routes of the other services (createAccount, createClub,
// createEvent) here.
import express, { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LOGIN_ERRORS, login } from '../services/login';
import { listClubs } from '../services/listClubs';
import { createEvent } from '../services/createEvent';
import { SessionStore } from './sessions';

/** A string field of the JSON body, or undefined when missing or not a string. */
function bodyField(req: Request, name: string): string | undefined {
  const value: unknown = req.body?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** The token of an "Authorization: Bearer <token>" header. */
function bearerToken(req: Request): string | undefined {
  const [scheme, token] = req.get('Authorization')?.split(' ') ?? [];
  return scheme === 'Bearer' ? token : undefined;
}

export function createApp(prisma: PrismaClient, sessions = new SessionStore()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  // The app running in a web browser (Expo web) is served from another origin
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST',
    });
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  /** Id of the logged-in account, or null when nobody is logged in. */
  const actorId = (req: Request) => sessions.get(bearerToken(req))?.accountId ?? null;

  // ID_002 Log In: the returned token identifies the user in the next requests
  app.post('/login', async (req, res) => {
    const result = await login(
      { email: bodyField(req, 'email'), password: bodyField(req, 'password') },
      prisma,
    );

    if (!result.success) {
      const missingField =
        result.message === LOGIN_ERRORS.emailRequired ||
        result.message === LOGIN_ERRORS.passwordRequired;
      res.status(missingField ? 400 : 401).json({ message: result.message });
      return;
    }

    res.json({ token: sessions.create(result.session), session: result.session });
  });

  // ID_008 Browse Clubs
  app.get('/clubs', async (req, res) => {
    const result = await listClubs({ actorId: actorId(req) }, prisma);

    if (!result.success) {
      res.status(401).json({ message: result.message });
      return;
    }

    res.json({ clubs: result.clubs });
  });
  
  // ID_015 - Create Event (T043)
  app.post('/events', async (req, res) => {
    const userId = actorId(req);

    if (userId === null) {
      res.status(401).json({ message: 'Login required' });
      return;
    }

    const clubId: unknown = req.body?.clubId;
    const capacity: unknown = req.body?.capacity;

    if (
      typeof clubId !== 'number' ||
      !Number.isSafeInteger(clubId) ||
      clubId <= 0
    ) {
      res.status(400).json({ message: 'Invalid club ID' });
      return;
    }

    if (
      capacity !== null &&
      capacity !== undefined &&
      (
        typeof capacity !== 'number' ||
        !Number.isSafeInteger(capacity)
      )
    ) {
      res.status(400).json({
        message: 'Capacity must be a positive integer',
      });
      return;
    }

    const result = await createEvent(
      {
        actorId: userId,
        clubId,
        title: bodyField(req, 'title'),
        category: bodyField(req, 'category'),
        date: bodyField(req, 'date'),
        startTime: bodyField(req, 'startTime'),
        endTime: bodyField(req, 'endTime'),
        location: bodyField(req, 'location'),
        capacity: capacity == null ? null : capacity as number,
      },
      prisma
    );

    if (!result.success) {
      res.status(
        result.message === 'Unauthorized user' ? 403 : 400
      ).json({ message: result.message });
      return;
    }

    res.status(201).json({
      message: result.message,
      event: result.event,
    });
  });

  // Unexpected errors (e.g. database unavailable): log them, keep details private
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  });

  return app;
}
