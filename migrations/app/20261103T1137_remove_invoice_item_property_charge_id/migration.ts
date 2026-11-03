#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/a951a0e44bde757d448198d144cdd4aa569eb28b154e6a07d741e9d37415abcf/contract';
import startContract from '../../snapshots/a951a0e44bde757d448198d144cdd4aa569eb28b154e6a07d741e9d37415abcf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f4f2817961f0ab8a614bdb288316665f1322c51cf521af3a4a9e06458ceaef84/contract';
import endContract from '../../snapshots/f4f2817961f0ab8a614bdb288316665f1322c51cf521af3a4a9e06458ceaef84/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'invoice_items',
        constraint: 'invoice_items_property_charge_id_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'invoice_items',
        index: 'invoice_items_property_charge_id_idx_aad71636',
      }),
      this.dropColumn({ schema: 'public', table: 'invoice_items', column: 'property_charge_id' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
