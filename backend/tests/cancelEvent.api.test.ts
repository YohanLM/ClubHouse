import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/api/app';
import { SessionStore } from '../src/api/sessions';
import { cancelEvent } from '../src/services/cancelEvent';

// The service has its own unit tests: only the HTTP layer is tested here.
jest.mock('../src/services/cancelEvent', () => ({
  ...jest.requireActual('../src/services/cancelEvent'),
  cancelEvent: jest.fn(),
}));

const prisma = {} as PrismaClient;
const sessions = new SessionStore();
const token = sessions.create({
  accountId: 3,
  name: 'Dana Lee',
  email: 'dana.lee@mail.mcgill.ca',
  role: 'CLUB_OWNER',
});
const app = createApp(prisma, sessions);

const cancelled = {
  id: 4,
  clubId: 10,
  title: 'Robotics Workshop',
  status: 'CANCELLED',
  cancellationReason: 'Room unavailable',
  attendeeCount: 2,
};

const cancel = (eventId: string = '4') =>
  request(app).post(`/events/${eventId}/cancel`).set('Authorization', `Bearer ${token}`);

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(cancelEvent).mockResolvedValue({ success: true, message: 'Event cancelled', event: cancelled });
});

describe('POST /events/:eventId/cancel', () => {
  test('cancels the event with a reason', async () => {
    const response = await cancel().send({ reason: 'Room unavailable' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Event cancelled', event: cancelled });
    expect(cancelEvent).toHaveBeenCalledWith(
      { actorId: 3, eventId: 4, reason: 'Room unavailable' },
      prisma,
    );
  });

  test.each([
    ['no body', undefined],
    ['a null reason', { reason: null }],
  ])('cancels the event with %s', async (_description, body) => {
    const response = await cancel().send(body);

    expect(response.status).toBe(200);
    expect(cancelEvent).toHaveBeenCalledWith({ actorId: 3, eventId: 4, reason: null }, prisma);
  });

  test('requires a login', async () => {
    const response = await request(app).post('/events/4/cancel');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Login required' });
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  test.each(['abc', '0', '-1', '1.5'])('returns 404 for the event id "%s"', async (eventId) => {
    const response = await cancel(eventId);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Event not found' });
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  test('rejects a reason that is not text', async () => {
    const response = await cancel().send({ reason: 42 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Cancellation reason must be text' });
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  test.each([
    ['Unauthorized user', 403],
    ['Event not found', 404],
    ['Event is already cancelled', 400],
    ['Event has already taken place', 400],
    ['Cancellation reason is too long', 400],
  ] as const)('returns "%s" with status %i', async (message, status) => {
    jest.mocked(cancelEvent).mockResolvedValue({ success: false, message });

    const response = await cancel();

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ message });
  });
});
