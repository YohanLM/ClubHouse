// Registration validation for ID_001 Create Account (T008).
// Pure functions with no database access: createAccount (T010) runs them
// before checking for duplicate emails and hashing the password.

export const REGISTRATION_ERRORS = {
  nameRequired: 'Name is required',
  emailRequired: 'Email is required',
  invalidEmail: 'Invalid McGill email',
  passwordRequired: 'Password is required',
  passwordTooWeak: 'Password too weak',
} as const;

export type RegistrationError =
  (typeof REGISTRATION_ERRORS)[keyof typeof REGISTRATION_ERRORS];

export const MCGILL_EMAIL_DOMAINS: readonly string[] = ['mail.mcgill.ca', 'mcgill.ca'];

export const PASSWORD_MIN_LENGTH = 8;

export interface RegistrationInput {
  name?: string | null;
  email?: string | null;
  password?: string | null;
}

export interface ValidRegistration {
  /** Trimmed name. */
  name: string;
  /** Trimmed, lowercased email. */
  email: string;
  /** Password exactly as entered (never trimmed). */
  password: string;
}

export type RegistrationValidationResult =
  | { valid: true; value: ValidRegistration }
  | { valid: false; message: RegistrationError };

/** Emails are stored and compared trimmed and lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateName(name: string | null | undefined): RegistrationError | null {
  if (!name || name.trim() === '') return REGISTRATION_ERRORS.nameRequired;
  return null;
}

export function validateEmail(email: string | null | undefined): RegistrationError | null {
  if (!email || email.trim() === '') return REGISTRATION_ERRORS.emailRequired;

  const parts = normalizeEmail(email).split('@');
  if (parts.length !== 2) return REGISTRATION_ERRORS.invalidEmail;

  const [localPart, domain] = parts;
  if (localPart === '' || /\s/.test(localPart)) return REGISTRATION_ERRORS.invalidEmail;
  if (!MCGILL_EMAIL_DOMAINS.includes(domain)) return REGISTRATION_ERRORS.invalidEmail;

  return null;
}

/**
 * A strong password has at least 8 characters, an uppercase letter,
 * a lowercase letter, a digit and a special character (not a letter,
 * digit or whitespace).
 */
export function validatePassword(password: string | null | undefined): RegistrationError | null {
  if (!password) return REGISTRATION_ERRORS.passwordRequired;

  const isStrong =
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password);

  return isStrong ? null : REGISTRATION_ERRORS.passwordTooWeak;
}

/**
 * Validates the registration form. Fields are checked in order
 * (name, email, password) and only the first error is returned.
 */
export function validateRegistration(input: RegistrationInput): RegistrationValidationResult {
  const message =
    validateName(input.name) ?? validateEmail(input.email) ?? validatePassword(input.password);
  if (message) return { valid: false, message };

  return {
    valid: true,
    value: {
      name: input.name!.trim(),
      email: normalizeEmail(input.email!),
      password: input.password!,
    },
  };
}
