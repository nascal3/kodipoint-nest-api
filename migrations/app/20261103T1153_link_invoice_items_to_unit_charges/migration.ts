#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/696f11b962f1ec5ac1b698791c8fe0dec96cb0e693c8df400b066032f9687f42/contract';
import endContract from '../../snapshots/696f11b962f1ec5ac1b698791c8fe0dec96cb0e693c8df400b066032f9687f42/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f4f2817961f0ab8a614bdb288316665f1322c51cf521af3a4a9e06458ceaef84/contract';
import startContract from '../../snapshots/f4f2817961f0ab8a614bdb288316665f1322c51cf521af3a4a9e06458ceaef84/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'invoice_items',
        column: col('unit_charge_property_charge_id', 'uuid', {
          codecRef: { codecId: 'pg/uuid@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice_items',
        column: col('unit_charge_property_unit_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice_items',
        column: col('unit_charge_valid_from', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_items',
        index: 'invoice_items_unit_charge_idx',
        columns: [
          'unit_charge_property_unit_id',
          'unit_charge_property_charge_id',
          'unit_charge_valid_from',
        ],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_items',
        foreignKey: {
          name: 'invoice_items_unit_charge_property_unit_id_unit_charge_property_charge_id_unit_charge_valid_from_fkey',
          columns: [
            'unit_charge_property_unit_id',
            'unit_charge_property_charge_id',
            'unit_charge_valid_from',
          ],
          references: {
            schema: 'public',
            table: 'property_unit_charges',
            columns: ['property_unit_id', 'property_charge_id', 'valid_from'],
          },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
