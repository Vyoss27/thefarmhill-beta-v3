import { PrismaClient } from "@prisma/client";

// Hindari bikin koneksi baru tiap hot-reload di dev (Next.js App Router).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
