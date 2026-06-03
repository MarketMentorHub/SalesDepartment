// Legt die drei Start-Accounts an (idempotent — mehrfach ausführbar).
// Aufruf:  npm run db:seed
import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email?: string;
  password?: string;
  role: Role;
};

const users: SeedUser[] = [
  {
    name: "Emilio",
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    role: Role.ADMIN,
  },
  {
    name: "Stephen",
    email: process.env.SEED_STEPHEN_EMAIL,
    password: process.env.SEED_STEPHEN_PASSWORD,
    role: Role.USER,
  },
  {
    name: "Torben",
    email: process.env.SEED_TORBEN_EMAIL,
    password: process.env.SEED_TORBEN_PASSWORD,
    role: Role.USER,
  },
];

async function main() {
  for (const u of users) {
    if (!u.email || !u.password) {
      console.warn(`⏭  ${u.name}: SEED_*-Variablen fehlen, übersprungen.`);
      continue;
    }
    const passwordHash = await argon2.hash(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { name: u.name, email: u.email, role: u.role, passwordHash },
    });
    console.log(`✅ ${u.name} <${u.email}> (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
