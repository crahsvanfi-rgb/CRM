const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('DELETE FROM "Importation";');
  console.log("Deleted all importations");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
