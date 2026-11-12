import {
  validateStatusChange,
  EVENT_STATUS_ERRORS as E,
  MAX_CANCELLATION_REASON_LENGTH,
} from '../src/services/eventStatus';

test('Scheduled -> Cancelled with a reason (trimmed)', () => {
  expect(validateStatusChange('SCHEDULED', 'CANCELLED', '  Speaker sick  ')).toEqual({
    ok: true,
    status: 'CANCELLED',
    cancellationReason: 'Speaker sick',
  });
});

test('Scheduled -> Completed without a reason', () => {
  expect(validateStatusChange('SCHEDULED', 'COMPLETED')).toEqual({
    ok: true,
    status: 'COMPLETED',
    cancellationReason: null,
  });
});

test.each([[undefined], [null], [''], ['   ']])(
  'cancelling without a reason is allowed (%p)',
  reason => {
    expect(validateStatusChange('SCHEDULED', 'CANCELLED', reason)).toEqual({
      ok: true,
      status: 'CANCELLED',
      cancellationReason: null,
    });
  }
);

test('reason longer than the max is rejected', () => {
  const long = 'x'.repeat(MAX_CANCELLATION_REASON_LENGTH + 1);
  expect(validateStatusChange('SCHEDULED', 'CANCELLED', long)).toEqual({
    ok: false,
    message: E.reasonTooLong,
  });
});

test('reason on a non-cancelled change is rejected', () => {
  expect(validateStatusChange('SCHEDULED', 'COMPLETED', 'oops')).toEqual({
    ok: false,
    message: E.reasonNotAllowed,
  });
});

test.each([
  ['CANCELLED', 'SCHEDULED'],
  ['CANCELLED', 'COMPLETED'],
  ['COMPLETED', 'SCHEDULED'],
  ['COMPLETED', 'CANCELLED'],
  ['SCHEDULED', 'SCHEDULED'],
] as const)('%s -> %s is not allowed', (from, to) => {
  expect(validateStatusChange(from, to, 'reason')).toEqual({
    ok: false,
    message: E.invalidTransition,
  });
});

test('unknown status is rejected', () => {
  expect(validateStatusChange('SCHEDULED', 'DELETED' as never)).toEqual({
    ok: false,
    message: E.invalidStatus,
  });
});
