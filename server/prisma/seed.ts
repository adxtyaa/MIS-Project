import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("test1234", 12);

  // 5 PGP1 users (current batch PGP42)
  const pgp1Users = [
    { email: "vikram@iiml.ac.in", name: "Vikram Sharma", pgpId: "PGP42001", role: "PGP1" as const },
    { email: "priya@iiml.ac.in", name: "Priya Patel", pgpId: "PGP42002", role: "PGP1" as const },
    { email: "arjun@iiml.ac.in", name: "Arjun Mehta", pgpId: "PGP42003", role: "PGP1" as const },
    { email: "neha@iiml.ac.in", name: "Neha Gupta", pgpId: "PGP42004", role: "PGP1" as const },
    { email: "rahul@iiml.ac.in", name: "Rahul Singh", pgpId: "PGP42005", role: "PGP1" as const },
  ];

  // 3 PGP2 users (previous batch PGP41)
  const pgp2Users = [
    { email: "ananya@iiml.ac.in", name: "Ananya Reddy", pgpId: "PGP41001", role: "PGP2" as const },
    { email: "karthik@iiml.ac.in", name: "Karthik Iyer", pgpId: "PGP41002", role: "PGP2" as const },
    { email: "deepa@iiml.ac.in", name: "Deepa Nair", pgpId: "PGP41003", role: "PGP2" as const },
  ];

  // 1 Admin user (PGP2)
  const adminUser = {
    email: "admin@iiml.ac.in",
    name: "Admin User",
    pgpId: "PGP41000",
    role: "PGP2" as const,
    isAdmin: true,
  };

  const allUsers = [...pgp1Users, ...pgp2Users, adminUser];

  const createdUsers: Record<string, string> = {};

  for (const userData of allUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password,
        isAdmin: userData.email === "admin@iiml.ac.in",
      },
    });
    createdUsers[userData.email] = user.id;
    console.log(`  Created user: ${userData.name} (${userData.role}${userData.email === "admin@iiml.ac.in" ? ", admin" : ""})`);
  }

  // SlotQualityScore records for 3 PGP2s
  for (const pgp2 of pgp2Users) {
    await prisma.slotQualityScore.upsert({
      where: { userId: createdUsers[pgp2.email] },
      update: {},
      create: {
        userId: createdUsers[pgp2.email],
        score: 50.0,
        totalSlots: 0,
        feedbackCount: 0,
      },
    });
    console.log(`  Created SlotQualityScore for: ${pgp2.name}`);
  }

  // CvUpload records for all 5 PGP1s (mock paths, no actual files)
  for (const pgp1 of pgp1Users) {
    await prisma.cvUpload.upsert({
      where: { id: `seed-cv-${pgp1.pgpId}` },
      update: {},
      create: {
        id: `seed-cv-${pgp1.pgpId}`,
        userId: createdUsers[pgp1.email],
        filePath: `uploads/${createdUsers[pgp1.email]}/mock_cv.pdf`,
        fileName: `${pgp1.name.replace(" ", "_")}_CV.pdf`,
        fileSize: 102400,
        cvScore: Math.round((Math.random() * 30 + 65) * 100) / 100,
        isActive: true,
      },
    });
    console.log(`  Created CvUpload for: ${pgp1.name}`);
  }

  // 3 historical Match records
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 3);
  pastDate1.setHours(0, 0, 0, 0);

  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 2);
  pastDate2.setHours(0, 0, 0, 0);

  const pastDate3 = new Date();
  pastDate3.setDate(pastDate3.getDate() - 1);
  pastDate3.setHours(0, 0, 0, 0);

  const matchData = [
    {
      id: "seed-match-1",
      pgp1Id: createdUsers["vikram@iiml.ac.in"],
      pgp2Id: createdUsers["ananya@iiml.ac.in"],
      windowDate: pastDate1,
      status: "COMPLETED" as const,
      cvScoreSnap: 85.5,
      slotScore: 50.0,
    },
    {
      id: "seed-match-2",
      pgp1Id: createdUsers["priya@iiml.ac.in"],
      pgp2Id: createdUsers["karthik@iiml.ac.in"],
      windowDate: pastDate2,
      status: "COMPLETED" as const,
      cvScoreSnap: 78.2,
      slotScore: 50.0,
    },
    {
      id: "seed-match-3",
      pgp1Id: createdUsers["arjun@iiml.ac.in"],
      pgp2Id: createdUsers["deepa@iiml.ac.in"],
      windowDate: pastDate3,
      status: "PENDING" as const,
      cvScoreSnap: 91.0,
      slotScore: 50.0,
    },
  ];

  for (const match of matchData) {
    await prisma.match.upsert({
      where: { id: match.id },
      update: {},
      create: match,
    });
    console.log(`  Created Match: ${match.id} (${match.status})`);
  }

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
