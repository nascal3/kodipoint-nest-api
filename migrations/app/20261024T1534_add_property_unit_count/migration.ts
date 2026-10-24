#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1d29e3c511faad2ba33f572904bcfecaf8e79bf9e6b2b956183c867812891a17/contract';
import endContract from '../../snapshots/1d29e3c511faad2ba33f572904bcfecaf8e79bf9e6b2b956183c867812891a17/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a9aa8f9aea16129a7d2efb5c9ae305a740c1ea38dd038e4ba479c3bc3f1ade4c/contract';
import startContract from '../../snapshots/a9aa8f9aea16129a7d2efb5c9ae305a740c1ea38dd038e4ba479c3bc3f1ade4c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';
import { Temporal } from '@js-temporal/polyfill';
import postgres from '@prisma/orm-postgres/runtime';

(globalThis as typeof globalThis & { Temporal: typeof Temporal }).Temporal = Temporal;

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'properties',
        column: col('unit_count', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('billing_address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('billing_email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('password_updated_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.dataTransform(contract, 'backfill-users-password_updated_at', {
        check: () =>
          db.public.users.select('id')
            .where((f, fns) => fns.eq(f.password_updated_at, null))
            .limit(1),
        run: () =>
          db.public.users.update({
            password_updated_at: Temporal.Now.instant(),
          }).where((f, fns) => fns.eq(f.password_updated_at, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'users', column: 'password_updated_at' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
