const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete all records created during tests. Add other models as you create them.
  await prisma.account.deleteMany();
  console.log('Test data reset: accounts cleared');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
