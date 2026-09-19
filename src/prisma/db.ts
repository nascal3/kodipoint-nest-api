import { Temporal } from '@js-temporal/polyfill';

(globalThis as typeof globalThis & { Temporal: typeof Temporal }).Temporal = Temporal;

import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract';
import contractJson from './contract.json' with { type: 'json' };

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
});

export type PrismaDb = typeof db;

export type PrismaTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
