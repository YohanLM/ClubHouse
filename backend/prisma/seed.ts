// Demo data for running the app locally (npm run db:setup from the repo root).
// Every account uses the password below. Running it again changes nothing.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

const PASSWORD = 'Passw0rd!23';

const accounts = [
  { name: 'ClubHouse Admin', email: 'admin.clubhouse@mcgill.ca', role: 'ADMINISTRATOR' },
  { name: 'Alice Tremblay', email: 'alice.tremblay@mail.mcgill.ca', role: 'USER' },
  { name: 'Dana Lee', email: 'dana.lee@mail.mcgill.ca', role: 'CLUB_OWNER' },
] as const;

// The clubs of the ID_008 Browse Clubs feature, all owned by Dana Lee
const clubs = [
  { name: 'Robotics Club', category: 'Academic', status: 'ACTIVE' },
  { name: 'Jazz Society', category: 'Arts', status: 'ACTIVE' },
  { name: 'Ski Club', category: 'Sports', status: 'INACTIVE' },
  { name: 'Debate Union', category: 'Academic', status: 'ACTIVE' },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { email: account.email },
      create: { ...account, passwordHash },
      update: {},
    });
  }

  const owner = await prisma.account.findUniqueOrThrow({
    where: { email: 'dana.lee@mail.mcgill.ca' },
  });

  for (const club of clubs) {
    await prisma.club.upsert({
      where: { name: club.name },
      create: { ...club, ownerId: owner.id },
      update: {},
    });
  }

  console.log(`Seeded ${accounts.length} accounts (password ${PASSWORD}) and ${clubs.length} clubs.`);
}

main().finally(() => prisma.$disconnect());
