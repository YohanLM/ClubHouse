// Unit tests for registration validation (T009, ID_001 Create Account).
import {
  REGISTRATION_ERRORS,
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
  validateRegistration,
} from '../src/services/registrationValidation';

const VALID = {
  name: 'Alice Tremblay',
  email: 'alice.tremblay@mail.mcgill.ca',
  password: 'Passw0rd!23',
};

describe('validateRegistration', () => {
  describe('ID_001 feature examples', () => {
    it.each([
      ['Alice Tremblay', 'alice.tremblay@mail.mcgill.ca', 'Passw0rd!23'],
      ['Bob Chen', 'bob.chen@mcgill.ca', 'Secur3Pass#1'],
    ])('accepts %s <%s>', (name, email, password) => {
      expect(validateRegistration({ name, email, password })).toEqual({
        valid: true,
        value: { name, email, password },
      });
    });

    it.each([
      ['Alice Tremblay', 'alice.tremblay@gmail.com', 'Passw0rd!23', 'Invalid McGill email'],
      ['Alice Tremblay', 'alice.tremblay@mail.mcgill.ca', 'abc', 'Password too weak'],
      ['', 'alice.tremblay@mail.mcgill.ca', 'Passw0rd!23', 'Name is required'],
      ['Alice Tremblay', '', 'Passw0rd!23', 'Email is required'],
      ['Alice Tremblay', 'alice.tremblay@mail.mcgill.ca', '', 'Password is required'],
    ])('rejects name "%s", email "%s", password "%s" with "%s"', (name, email, password, message) => {
      expect(validateRegistration({ name, email, password })).toEqual({ valid: false, message });
    });
  });

  it('returns the trimmed name and the normalized email', () => {
    const result = validateRegistration({
      name: '  Bob Chen  ',
      email: '  Bob.Chen@McGill.CA ',
      password: 'Secur3Pass#1',
    });
    expect(result).toEqual({
      valid: true,
      value: { name: 'Bob Chen', email: 'bob.chen@mcgill.ca', password: 'Secur3Pass#1' },
    });
  });

  it('keeps the password exactly as entered', () => {
    const password = ' Pass w0rd!23 ';
    const result = validateRegistration({ ...VALID, password });
    expect(result.valid && result.value.password).toBe(password);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('treats %s fields as empty', (_label, missing) => {
    expect(validateRegistration({ ...VALID, name: missing })).toEqual({
      valid: false,
      message: REGISTRATION_ERRORS.nameRequired,
    });
    expect(validateRegistration({ ...VALID, email: missing })).toEqual({
      valid: false,
      message: REGISTRATION_ERRORS.emailRequired,
    });
    expect(validateRegistration({ ...VALID, password: missing })).toEqual({
      valid: false,
      message: REGISTRATION_ERRORS.passwordRequired,
    });
  });

  describe('when several fields are invalid, reports only the first one (name, email, password)', () => {
    it('all fields empty -> name', () => {
      expect(validateRegistration({ name: '', email: '', password: '' })).toEqual({
        valid: false,
        message: REGISTRATION_ERRORS.nameRequired,
      });
    });

    it('empty name and invalid email -> name', () => {
      expect(validateRegistration({ ...VALID, name: '', email: 'a@gmail.com' })).toEqual({
        valid: false,
        message: REGISTRATION_ERRORS.nameRequired,
      });
    });

    it('invalid email and weak password -> email', () => {
      expect(validateRegistration({ ...VALID, email: 'a@gmail.com', password: 'abc' })).toEqual({
        valid: false,
        message: REGISTRATION_ERRORS.invalidEmail,
      });
    });
  });
});

describe('validateName', () => {
  it('accepts a non-empty name', () => {
    expect(validateName('Carla Gomez')).toBeNull();
  });

  it.each(['', '   ', '\t\n'])('rejects blank name %j', (name) => {
    expect(validateName(name)).toBe(REGISTRATION_ERRORS.nameRequired);
  });
});

describe('validateEmail', () => {
  it.each([
    'alice.tremblay@mail.mcgill.ca',
    'bob.chen@mcgill.ca',
    'ALICE.Tremblay@MAIL.McGill.ca',
    '  carla.gomez@mail.mcgill.ca  ',
    'first.last-2@mcgill.ca',
  ])('accepts %j', (email) => {
    expect(validateEmail(email)).toBeNull();
  });

  it.each(['', '   '])('rejects blank email %j as required', (email) => {
    expect(validateEmail(email)).toBe(REGISTRATION_ERRORS.emailRequired);
  });

  it.each([
    'alice.tremblay@gmail.com',
    'alice@cs.mcgill.ca',
    'alice@mcgill.ca.evil.com',
    'alice@mail.mcgill.com',
    'alice@mcgillca',
    'alice.tremblay.mail.mcgill.ca',
    '@mcgill.ca',
    'alice@@mcgill.ca',
    'alice@bob@mcgill.ca',
    'alice tremblay@mcgill.ca',
    'alice@',
  ])('rejects %j as not a McGill email', (email) => {
    expect(validateEmail(email)).toBe(REGISTRATION_ERRORS.invalidEmail);
  });
});

describe('validatePassword', () => {
  it.each(['Passw0rd!23', 'Secur3Pass#1', 'Owner#Pass45', 'Admin!Pass67', 'Aa1!aaaa'])(
    'accepts strong password %j',
    (password) => {
      expect(validatePassword(password)).toBeNull();
    },
  );

  it('rejects an empty password as required', () => {
    expect(validatePassword('')).toBe(REGISTRATION_ERRORS.passwordRequired);
  });

  it.each([
    ['too short (7 characters)', 'Aa1!aaa'],
    ['no uppercase letter', 'passw0rd!23'],
    ['no lowercase letter', 'PASSW0RD!23'],
    ['no digit', 'Password!ab'],
    ['no special character', 'Passw0rd123'],
    ['only whitespace as the special character', 'Passw0rd 23'],
    ['whitespace only', '        '],
    ['feature example "abc"', 'abc'],
  ])('rejects a password with %s', (_reason, password) => {
    expect(validatePassword(password)).toBe(REGISTRATION_ERRORS.passwordTooWeak);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  ALICE.Tremblay@Mail.McGill.CA ')).toBe('alice.tremblay@mail.mcgill.ca');
  });

  it('leaves an already normalized email unchanged', () => {
    expect(normalizeEmail('bob.chen@mcgill.ca')).toBe('bob.chen@mcgill.ca');
  });
});
