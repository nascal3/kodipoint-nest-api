#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1d29e3c511faad2ba33f572904bcfecaf8e79bf9e6b2b956183c867812891a17/contract';
import startContract from '../../snapshots/1d29e3c511faad2ba33f572904bcfecaf8e79bf9e6b2b956183c867812891a17/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a951a0e44bde757d448198d144cdd4aa569eb28b154e6a07d741e9d37415abcf/contract';
import endContract from '../../snapshots/a951a0e44bde757d448198d144cdd4aa569eb28b154e6a07d741e9d37415abcf/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'properties', column: 'country' }),
      this.dropColumn({ schema: 'public', table: 'property_charges', column: 'billing_frequency' }),
      this.createTable({
        schema: 'public',
        table: 'cities',
        columns: [
          col('country_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'countries',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauth_accounts',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider_account_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'property_unit_charges',
        columns: [
          col('custom_amount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('property_charge_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('property_unit_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('valid_from', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('valid_to', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [primaryKey(['property_unit_id', 'property_charge_id', 'valid_from'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'property_units',
        columns: [
          col('bedroom_count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('billing_frequency', 'text', {
            notNull: true,
            default: lit('MONTHLY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('market_rent', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('AVAILABLE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('unit_number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'property_units_billing_frequency_check_3a66bf05',
            "\"billing_frequency\" IN ('MONTHLY', 'QUARTERLY', 'BI_ANNUALLY', 'ANNUALLY')",
          ),
          checkExpression(
            'property_units_status_check_d1e1aab6',
            "\"status\" IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'ARCHIVED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'tenancies',
        column: col('property_unit_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'properties',
        column: col('country_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'countries',
        constraint: 'countries_name_key',
        columns: ['name'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoices',
        constraint: 'invoices_status_check_2eafa38f',
        expression:
          "\"status\" IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_status_check_c6b33104',
        expression: "\"status\" IN ('PENDING', 'SUCCESSFUL', 'REVERSED', 'FAILED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'properties',
        constraint: 'properties_status_check_1bcc6c54',
        expression: "\"status\" IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'property_charges',
        constraint: 'property_charges_name_key',
        columns: ['name'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenancies',
        constraint: 'tenancies_status_check_4654e3fb',
        expression: "\"status\" IN ('ACTIVE', 'ENDED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tenants',
        constraint: 'tenants_status_check_4654e3fb',
        expression: "\"status\" IN ('ACTIVE', 'ENDED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'users',
        constraint: 'users_status_check_a50a312b',
        expression: "\"status\" IN ('ACTIVE', 'INACTIVE', 'BANNED')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'cities',
        index: 'cities_country_id_idx_30642658',
        columns: ['country_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauth_accounts',
        index: 'oauth_accounts_provider_provider_account_id_idx_c388af0e',
        columns: ['provider', 'provider_account_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauth_accounts',
        index: 'oauth_accounts_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'properties',
        index: 'properties_country_id_idx_30642658',
        columns: ['country_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_unit_charges',
        index: 'charge_valid_from_idx',
        columns: ['property_charge_id', 'valid_from'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_unit_charges',
        index: 'property_unit_charges_property_charge_id_idx_aad71636',
        columns: ['property_charge_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_unit_charges',
        index: 'property_unit_charges_property_unit_id_idx_2895e80f',
        columns: ['property_unit_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_unit_charges',
        index: 'unit_charge_valid_from_idx',
        columns: ['property_unit_id', 'valid_from'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_units',
        index: 'property_units_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_units',
        index: 'property_units_property_id_idx_9fa9619b',
        columns: ['property_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_units',
        index: 'property_units_property_id_status_idx_7a5ca777',
        columns: ['property_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_property_unit_id_idx_2895e80f',
        columns: ['property_unit_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cities',
        foreignKey: {
          name: 'cities_country_id_fkey',
          columns: ['country_id'],
          references: { schema: 'public', table: 'countries', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauth_accounts',
        foreignKey: {
          name: 'oauth_accounts_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'properties',
        foreignKey: {
          name: 'properties_country_id_fkey',
          columns: ['country_id'],
          references: { schema: 'public', table: 'countries', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_unit_charges',
        foreignKey: {
          name: 'property_unit_charges_property_unit_id_fkey',
          columns: ['property_unit_id'],
          references: { schema: 'public', table: 'property_units', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_unit_charges',
        foreignKey: {
          name: 'property_unit_charges_property_charge_id_fkey',
          columns: ['property_charge_id'],
          references: { schema: 'public', table: 'property_charges', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_units',
        foreignKey: {
          name: 'property_units_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_units',
        foreignKey: {
          name: 'property_units_property_id_fkey',
          columns: ['property_id'],
          references: { schema: 'public', table: 'properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenancies',
        foreignKey: {
          name: 'tenancies_property_unit_id_fkey',
          columns: ['property_unit_id'],
          references: { schema: 'public', table: 'property_units', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
