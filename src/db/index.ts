import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database");
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
}

export async function disconnectFromDatabase() {
  await prisma.$disconnect();
  console.log("Disconnected from PostgreSQL database");
}

export { prisma };
