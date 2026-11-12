import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não configurada. Copie backend/.env.example para backend/.env e informe os dados do PostgreSQL."
  );
}

/** @type {import('prisma/config').PrismaConfig} */
export default {
  schema: path.join(backendDirectory, "prisma/schema.prisma"),
  migrations: {
    path: path.join(backendDirectory, "prisma/migrations"),
    seed: `tsx "${path.join(backendDirectory, "seed.ts")}"`,
  },
  datasource: { url: databaseUrl },
};
