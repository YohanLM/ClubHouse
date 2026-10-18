
import { PrismaClient, Prisma } from '@prisma/client';
import {
  validateRegistration,
  RegistrationInput,
} from './registrationValidation';
import bcrypt from 'bcryptjs';

// Additional optional registration fields
export interface CreateAccountInput extends RegistrationInput {
  faculty?: string | null;
  studyYear?: string | null;
}

// Public account information (never includes passwordHash)
export interface CreatedAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  faculty: string | null;
  studyYear: string | null;
}

// Possible results of account creation
export type CreateAccountResult =
  | {
      success: true;
      message: 'Account created';
      account: CreatedAccount;
    }
  | {
      success: false;
      message: string;
    };

// Create an account using Prisma
export async function createAccount(
  input: CreateAccountInput,
  prisma: PrismaClient
): Promise<CreateAccountResult> {

  // 1. Validate registration information
  const validation = validateRegistration(input);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
    };
  }

  const { name, email, password } = validation.value;

  // 2. Check whether the email is already registered
  const existingAccount = await prisma.account.findUnique({
    where: { email },
  });

  if (existingAccount) {
    return {
      success: false,
      message: 'Email already registered',
    };
  }

  // 3. Hash password before saving
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Create account in database
  try {
    const account = await prisma.account.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'USER',
        faculty: input.faculty ?? null,
        studyYear: input.studyYear ?? null,
      },
    });

    // 5. Return only public account information
    return {
      success: true,
      message: 'Account created',
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        faculty: account.faculty,
        studyYear: account.studyYear,
      },
    };

  } catch (error: unknown) {

  // Handle duplicate emails caused by concurrent requests
  if (
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002'
) {
    if (error.code === 'P2002') {
      return {
        success: false,
        message: 'Email already registered',
      };
    }
  }

  throw error;
}
}
