import { Before, AfterAll } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';

Before(async function () {
  await prisma.event.deleteMany();
  await prisma.club.deleteMany();
  await prisma.account.deleteMany();
});

AfterAll(async () => {
  await prisma.$disconnect();
});
