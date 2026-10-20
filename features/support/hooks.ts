import { Before, AfterAll } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';

Before(async function () {
  if (process.env.DATABASE_URL !== 'file:./test.db') {
    throw new Error('Acceptance tests must use the isolated test database. Run npm run test:acceptance.');
  }
  await prisma.event.deleteMany();
  await prisma.club.deleteMany();
  await prisma.account.deleteMany();
});

AfterAll(async () => {
  await prisma.$disconnect();
});
