#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/149f7d4423c5461988c225361a1759a2f9c57c57f95bd10023c32dc7d01b7359/contract';
import startContract from '../../snapshots/149f7d4423c5461988c225361a1759a2f9c57c57f95bd10023c32dc7d01b7359/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a9aa8f9aea16129a7d2efb5c9ae305a740c1ea38dd038e4ba479c3bc3f1ade4c/contract';
import endContract from '../../snapshots/a9aa8f9aea16129a7d2efb5c9ae305a740c1ea38dd038e4ba479c3bc3f1ade4c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'users',
        column: 'status',
        defaultSql: "DEFAULT 'ACTIVE'",
        operationClass: 'widening',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
