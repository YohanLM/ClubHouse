import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/api/app';
import { SessionStore } from '../src/api/sessions';
import { rsvpToEvent } from '../src/services/rsvpToEvent';

jest.mock('../src/services/rsvpToEvent', () => ({
  ...jest.requireActual('../src/services/rsvpToEvent'),
  rsvpToEvent: jest.fn(),
}));

const prisma = {} as PrismaClient;
const sessions = new SessionStore();
const token = sessions.create({
  accountId: 7,
  name: 'Alice Tremblay',
  email: 'alice.tremblay@mail.mcgill.ca',
  role: 'USER',
});
const app = createApp(prisma, sessions);

beforeEach(() => {
  jest.resetAllMocks();
});

test('posts the RSVP and returns the attendee count', async () => {
  jest.mocked(rsvpToEvent).mockResolvedValue({
    success: true,
    message: 'RSVP saved',
    eventId: 20,
    response: 'ATTENDING',
    attendeeCount: 3,
  });

  const response = await request(app)
    .post('/events/20/rsvp')
    .set('Authorization', `Bearer ${token}`)
    .send({ response: 'Attending' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    message: 'RSVP saved',
    eventId: 20,
    response: 'ATTENDING',
    attendeeCount: 3,
  });
  expect(rsvpToEvent).toHaveBeenCalledWith(
    { actorId: 7, eventId: 20, response: 'Attending' },
    prisma
  );
});

test('maps RSVP failures to their HTTP status and message', async () => {
  jest.mocked(rsvpToEvent).mockResolvedValue({
    success: false,
    message: 'Event is full',
  });

  const response = await request(app)
    .post('/events/20/rsvp')
    .set('Authorization', `Bearer ${token}`)
    .send({ response: 'Attending' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ message: 'Event is full' });
});
