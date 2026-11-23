import {
  EVENT_VALIDATION_ERRORS,
  isValidDate,
  todayInMontreal,
  validateEvent,
} from '../src/services/eventValidation';

const clock = () => new Date('2026-11-15T17:00:00Z');
const valid = {
  title: 'Workshop',
  category: 'Academic',
  date: '2026-12-03',
  startTime: '18:00',
  endTime: '20:00',
  location: 'McConnell 103',
  capacity: null,
};

test('accepts a valid event and a date equal to today', () => {
  expect(validateEvent(valid, clock)).toBeNull();
  expect(validateEvent({ ...valid, date: '2026-11-15' }, clock)).toBeNull();
});

test.each([
  [{ title: '' }, 'titleRequired'],
  [{ category: '' }, 'categoryRequired'],
  [{ date: '' }, 'dateInvalid'],
  [{ date: '2026-02-30' }, 'dateInvalid'],
  [{ date: '2026-11-14' }, 'datePast'],
  [{ startTime: '24:00' }, 'timeInvalid'],
  [{ endTime: '20:60' }, 'timeInvalid'],
  [{ startTime: '9:00' }, 'timeInvalid'],
  [{ endTime: '18:00' }, 'endBeforeStart'],
  [{ endTime: '17:59' }, 'endBeforeStart'],
  [{ location: '' }, 'locationRequired'],
  [{ capacity: 0 }, 'capacityInvalid'],
  [{ capacity: -1 }, 'capacityInvalid'],
  [{ capacity: 1.5 }, 'capacityInvalid'],
  [{ capacity: NaN }, 'capacityInvalid'],
  [{ capacity: Infinity }, 'capacityInvalid'],
  [{ capacity: Number.MAX_SAFE_INTEGER + 1 }, 'capacityInvalid'],
] as const)('rejects %j with %s', (changes, error) => {
  expect(validateEvent({ ...valid, ...changes }, clock)).toBe(EVENT_VALIDATION_ERRORS[error]);
});

test.each([undefined, null, 1, Number.MAX_SAFE_INTEGER])('accepts capacity %s', capacity => {
  expect(validateEvent({ ...valid, capacity }, clock)).toBeNull();
});

test('accepts midnight and the final minute of the day', () => {
  expect(validateEvent({ ...valid, startTime: '00:00', endTime: '23:59' }, clock)).toBeNull();
});

test('preserves validation error priority when multiple fields are invalid', () => {
  const invalid = { ...valid, title: '', category: '', date: 'bad', capacity: 0 };
  expect(validateEvent(invalid, clock)).toBe('Title is required');
  expect(validateEvent({ ...invalid, title: 'Workshop' }, clock)).toBe('Category is required');
  expect(validateEvent({ ...invalid, title: 'Workshop', category: 'Academic' }, clock))
    .toBe('Invalid event date');
});

test('allows an unchanged past date during editing but rejects a changed past date', () => {
  const past = { ...valid, date: '2026-11-01' };
  expect(validateEvent(past, clock, '2026-11-01')).toBeNull();
  expect(validateEvent(past, clock, '2026-11-02')).toBe('Event date cannot be past');
  expect(validateEvent(past, clock)).toBe('Event date cannot be past');
});

test('still validates all other fields when the edit keeps a past date', () => {
  expect(validateEvent({ ...valid, date: '2026-11-01', capacity: 0 }, clock, '2026-11-01'))
    .toBe('Capacity must be a positive integer');
  expect(validateEvent({ ...valid, date: '2026-02-30' }, clock, '2026-02-30'))
    .toBe('Invalid event date');
});

test.each([
  ['2024-02-29', true], ['2026-02-29', false], ['2000-02-29', true],
  ['2100-02-29', false], ['2026-04-31', false], ['2026-00-10', false],
  ['2026-13-01', false], ['2026-11-00', false], ['2026-1-01', false],
  ['2026-11-15T12:00:00Z', false],
])('checks calendar date %s', (date, expected) => {
  expect(isValidDate(date)).toBe(expected);
});

test.each([
  ['2026-01-01T04:59:59Z', '2025-12-31'],
  ['2026-01-01T05:00:00Z', '2026-01-01'],
  ['2026-07-01T03:59:59Z', '2026-06-30'],
  ['2026-07-01T04:00:00Z', '2026-07-01'],
])('uses the Montreal date at %s', (instant, expected) => {
  const now = () => new Date(instant);
  expect(todayInMontreal(now())).toBe(expected);
  expect(validateEvent({ ...valid, date: expected }, now)).toBeNull();
});
