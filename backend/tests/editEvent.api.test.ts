import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/api/app';
import { SessionStore } from '../src/api/sessions';
import { editEvent } from '../src/services/editEvent';
import { listOwnedEvents } from '../src/services/listOwnedEvents';

jest.mock('../src/services/editEvent', () => ({
  ...jest.requireActual('../src/services/editEvent'),
  editEvent: jest.fn(),
}));
jest.mock('../src/services/listOwnedEvents', () => ({
  ...jest.requireActual('../src/services/listOwnedEvents'),
  listOwnedEvents: jest.fn(),
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

const updated = {
  id: 4,
  clubId: 10,
  title: 'Robotics Workshop',
  category: 'Academic',
  date: '2026-12-03',
  startTime: '18:00',
  endTime: '20:00',
  location: 'Trottier 0100',
  capacity: 50,
  status: 'SCHEDULED',
  attendeeCount: 2,
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /events/owned', () => {
  test('returns the events the owner can edit', async () => {
    jest.mocked(listOwnedEvents).mockResolvedValue({ success: true, events: [] });

    const response = await request(app).get('/events/owned').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ events: [] });
    expect(listOwnedEvents).toHaveBeenCalledWith({ actorId: 3 }, prisma);
  });

  test('requires a login', async () => {
    jest.mocked(listOwnedEvents).mockResolvedValue({ success: false, message: 'Login required' });

    const response = await request(app).get('/events/owned');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Login required' });
  });
});

describe('PATCH /events/:eventId', () => {
  test('sends only the fields present in the body and returns the updated event', async () => {
    jest.mocked(editEvent).mockResolvedValue({ success: true, message: 'Event updated', event: updated as never });

    const response = await request(app)
      .patch('/events/4')
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Trottier 0100', capacity: 50, clubId: 99, status: 'CANCELLED' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Event updated', event: updated });
    expect(editEvent).toHaveBeenCalledWith(
      { actorId: 3, eventId: 4, location: 'Trottier 0100', capacity: 50 },
      prisma
    );
  });

  test('passes a null capacity to remove the limit', async () => {
    jest.mocked(editEvent).mockResolvedValue({ success: true, message: 'Event updated', event: updated as never });

    await request(app).patch('/events/4').set('Authorization', `Bearer ${token}`).send({ capacity: null });

    expect(editEvent).toHaveBeenCalledWith({ actorId: 3, eventId: 4, capacity: null }, prisma);
  });

  test('rejects a capacity that is not an integer without calling the service', async () => {
    const response = await request(app)
      .patch('/events/4')
      .set('Authorization', `Bearer ${token}`)
      .send({ capacity: '50' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Capacity must be a positive integer' });
    expect(editEvent).not.toHaveBeenCalled();
  });

  test('requires a login', async () => {
    const response = await request(app).patch('/events/4').send({ location: 'Trottier 0100' });

    expect(response.status).toBe(401);
    expect(editEvent).not.toHaveBeenCalled();
  });

  test('returns 404 for an invalid event id', async () => {
    const response = await request(app).patch('/events/abc').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Event not found' });
    expect(editEvent).not.toHaveBeenCalled();
  });

  test.each([
    ['Unauthorized user', 403],
    ['Event not found', 404],
    ['Cancelled events cannot be edited', 400],
    ['Title is required', 400],
  ] as const)('maps "%s" to status %i', async (message, status) => {
    jest.mocked(editEvent).mockResolvedValue({ success: false, message });

    const response = await request(app)
      .patch('/events/4')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ message });
  });

  test('allows PATCH in cross-origin requests', async () => {
    const response = await request(app).options('/events/4');

    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });
});
