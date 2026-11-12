#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/696f11b962f1ec5ac1b698791c8fe0dec96cb0e693c8df400b066032f9687f42/contract';
import startContract from '../../snapshots/696f11b962f1ec5ac1b698791c8fe0dec96cb0e693c8df400b066032f9687f42/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/820dd9565d47791c0c23cb6f1b8d24dd69d59d05b1a751c91e3f9c1a59294e84/contract';
import endContract from '../../snapshots/820dd9565d47791c0c23cb6f1b8d24dd69d59d05b1a751c91e3f9c1a59294e84/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'property_charges',
        constraint: 'property_charges_name_key',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'property_units',
        constraint: 'property_units_status_check_d1e1aab6',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'tenancies',
        constraint: 'tenancies_status_check_4654e3fb',
      }),
      this.dropColumn({ schema: 'public', table: 'tenancies', column: 'monthly_rent' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'tenants',
        constraint: 'tenants_status_check_4654e3fb',
      }),
      this.addColumn({
        schema: 'public',
        table: 'properties',
        column: col('property_use_type', 'text', {
          notNull: true,
          default: lit('RESIDENTIAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'property_units',
        column: col('property_use_type', 'text', {
          notNull: true,
          default: lit('RESIDENTIAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenants',
        column: col('identificationDoc', 'text', {
          notNull: true,
          default: lit('NATIONAL_ID'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'property_charges',
        column: col('stub', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-property_charges-stub', {
        check: () => placeholder('backfill-property_charges-stub:check'),
        run: () => placeholder('backfill-property_charges-stub:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'property_charges', column: 'stub' }),
      this.addColumn({
        schema: 'public',
        table: 'tenants',
        column: col('emergency_contact_relationship', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dataTransform(endContract, 'backfill-tenants-emergency_contact_relationship', {
        check: () => placeholder('backfill-tenants-emergency_contact_relationship:check'),
        run: () => placeholder('backfill-tenants-emergency_contact_relationship:run'),
      }),
      this.setNotNull({
        schema: 'public',
        table: 'tenants',
        column: 'emergency_contact_relationship',
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenants',
        column: col('identificationDocNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-tenants-identificationDocNumber', {
        check: () => placeholder('backfill-tenants-identificationDocNumber:check'),
        run: () => placeholder('backfill-tenants-identificationDocNumber:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'tenants', column: 'identificationDocNumber' }),
      this.dataTransform(endContract, 'handle-nulls-tenants-emergency_contact_name', {
        check: () => placeholder('handle-nulls-tenants-emergency_contact_name:check'),
        run: () => placeholder('handle-nulls-tenants-emergency_contact_name:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'tenants', column: 'emergency_contact_name' }),
      this.dataTransform(endContract, 'handle-nulls-tenants-emergency_contact_phone', {
        check: () => placeholder('handle-nulls-tenants-emergency_contact_phone:check'),
        run: () => placeholder('handle-nulls-tenants-emergency_contact_phone:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'tenants', column: 'emergency_contact_phone' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'properties',
        constraint: 'properties_property_use_type_check_a1c2b734',
        expression: "\"property_use_type\" IN ('RESIDENTIAL', 'COMMERCIAL', 'MIXED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'property_charges',
        constraint: 'property_charges_manager_id_property_id_stub_key',
        columns: ['manager_id', 'property_id', 'stub'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'property_units',
        constraint: 'property_units_property_use_type_check_a1c2b734',
        expression: "\"property_use_type\" IN ('RESIDENTIAL', 'COMMERCIAL', 'MIXED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'property_units',
        constraint: 'property_units_status_check_bdeb487e',
        expression:
          "\"status\" IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE', 'ARCHIVED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenancies',
        constraint: 'tenancies_status_check_76b147e1',
        expression: "\"status\" IN ('ACTIVE', 'EXPIRING', 'ENDED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenants',
        constraint: 'tenants_identificationDoc_check_422767a4',
        expression: "\"identificationDoc\" IN ('NATIONAL_ID', 'PASSPORT')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenants',
        constraint: 'tenants_status_check_e49e6437',
        expression: "\"status\" IN ('ACTIVE', 'NOTICE', 'ENDED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
