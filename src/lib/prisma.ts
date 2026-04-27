import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // 1) Create a PostgreSQL connection pool from env config
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // 2) Wrap the pool with Prisma's PostgreSQL adapter
  const adapter = new PrismaPg(pool);
  // 3) Initialize Prisma client with the adapter
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
