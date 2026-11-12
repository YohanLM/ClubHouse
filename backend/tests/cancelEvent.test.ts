import { PrismaClient } from '@prisma/client';
import { cancelEvent, CANCEL_EVENT_ERRORS as E } from '../src/services/cancelEvent';
import { MAX_CANCELLATION_REASON_LENGTH } from '../src/services/eventStatus';

const prisma = {
  event: { findUnique: jest.fn(), updateMany: jest.fn() },
  account: { findUnique: jest.fn() },
} as unknown as PrismaClient;

const OWNER_ID = 2;
const base = { actorId: OWNER_ID, eventId: 20 };

function mockEvent(status = 'SCHEDULED') {
  jest.mocked(prisma.event.findUnique).mockResolvedValue({
    id: 20,
    clubId: 10,
    title: 'Robotics Workshop',
    status,
    club: { id: 10, ownerId: OWNER_ID },
  } as never);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockEvent();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({
    id: OWNER_ID,
    role: 'CLUB_OWNER',
  } as never);
  jest.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 });
});

test('cancels a scheduled event with a trimmed reason', async () => {
  const result = await cancelEvent({ ...base, reason: '  Speaker sick  ' }, prisma);

  expect(result).toEqual({
    success: true,
    message: 'Event cancelled',
    event: {
      id: 20,
      clubId: 10,
      title: 'Robotics Workshop',
      status: 'CANCELLED',
      cancellationReason: 'Speaker sick',
    },
  });
  expect(prisma.event.updateMany).toHaveBeenCalledWith({
    where: { id: 20, status: 'SCHEDULED' },
    data: { status: 'CANCELLED', cancellationReason: 'Speaker sick' },
  });
});

test.each([[undefined], [null], ['   ']])('cancels without a reason (%p)', async reason => {
  const result = await cancelEvent({ ...base, reason }, prisma);

  expect(result).toMatchObject({
    success: true,
    event: { status: 'CANCELLED', cancellationReason: null },
  });
});

test('rejects a reason that is too long', async () => {
  const reason = 'x'.repeat(MAX_CANCELLATION_REASON_LENGTH + 1);
  const result = await cancelEvent({ ...base, reason }, prisma);

  expect(result).toEqual({ success: false, message: E.reasonTooLong });
  expect(prisma.event.updateMany).not.toHaveBeenCalled();
});

test('rejects unauthenticated users', async () => {
  const result = await cancelEvent({ ...base, actorId: null }, prisma);

  expect(result).toEqual({ success: false, message: E.unauthorized });
  expect(prisma.event.findUnique).not.toHaveBeenCalled();
});

test('rejects an unknown event', async () => {
  jest.mocked(prisma.event.findUnique).mockResolvedValue(null);

  const result = await cancelEvent(base, prisma);

  expect(result).toEqual({ success: false, message: E.eventNotFound });
});

test('rejects a user who does not own the club', async () => {
  const result = await cancelEvent({ ...base, actorId: 3 }, prisma);

  expect(result).toEqual({ success: false, message: E.unauthorized });
  expect(prisma.event.updateMany).not.toHaveBeenCalled();
});

test('rejects an owner whose role is no longer CLUB_OWNER', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue({
    id: OWNER_ID,
    role: 'USER',
  } as never);

  const result = await cancelEvent(base, prisma);

  expect(result).toEqual({ success: false, message: E.unauthorized });
});

test.each(['CANCELLED', 'COMPLETED'])('rejects a %s event', async status => {
  mockEvent(status);

  const result = await cancelEvent(base, prisma);

  expect(result).toEqual({ success: false, message: E.notScheduled });
  expect(prisma.event.updateMany).not.toHaveBeenCalled();
});

test('rejects when the event changed status concurrently', async () => {
  jest.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 });

  const result = await cancelEvent(base, prisma);

  expect(result).toEqual({ success: false, message: E.notScheduled });
});
