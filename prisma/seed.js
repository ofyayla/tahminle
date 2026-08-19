const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO_USERS = [
  { displayName: "CimbomKral", email: "demo1@tahminle.app", favoriteTeam: "GS", balance: 2140 },
  { displayName: "SariLacivert", email: "demo2@tahminle.app", favoriteTeam: "FB", balance: 1860 },
  { displayName: "KaraKartal61", email: "demo3@tahminle.app", favoriteTeam: "BJK", balance: 1590 },
  { displayName: "AslanPençesi", email: "demo4@tahminle.app", favoriteTeam: "GS", balance: 1320 },
  { displayName: "Fenerbahceli06", email: "demo5@tahminle.app", favoriteTeam: "FB", balance: 1105 },
  { displayName: "BJK1903", email: "demo6@tahminle.app", favoriteTeam: "BJK", balance: 980 },
  { displayName: "SuperLigTakip", email: "demo7@tahminle.app", favoriteTeam: null, balance: 860 },
  { displayName: "TahminUstasi", email: "demo8@tahminle.app", favoriteTeam: "GS", balance: 640 },
];

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { balance: u.balance },
      create: {
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        favoriteTeam: u.favoriteTeam,
        balance: u.balance,
        startBalance: 1000,
      },
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
