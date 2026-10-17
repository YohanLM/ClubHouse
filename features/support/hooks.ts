import { Before, AfterAll } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma';

Before(async function () {
  // Reset test data between scenarios so each scenario starts with a clean DB
  await prisma.account.deleteMany();
});

AfterAll(async () => {
  await prisma.$disconnect();
});
